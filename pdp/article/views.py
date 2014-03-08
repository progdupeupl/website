# coding: utf-8

from datetime import datetime

from django.shortcuts import get_object_or_404, redirect
from django.core.urlresolvers import reverse
from django.core.exceptions import PermissionDenied
from django.views.decorators.http import require_POST
from django.http import Http404, HttpResponse, HttpResponseBadRequest

from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User

from pdp.settings import BOT_ENABLED

from pdp.utils import render_template, slugify, bot
from pdp.utils.cache import template_cache_delete
from pdp.utils.articles import export_article

from pdp.article.models import Article, get_prev_article, get_next_article, \
    get_last_articles, ArticleCategory
from pdp.article.forms import NewArticleForm, EditArticleForm


def index(request):
    """Display articles list.

    Returns:
        HttpResponse

    """
    article = Article.objects.all()\
        .filter(is_visible=True)\
        .order_by('-pubdate')

    pending_articles = None
    if request.user.has_perm('article.change_article'):
        pending_articles = Article.objects.all()\
            .filter(is_pending=True)\
            .order_by('-pubdate')

    all_article_category = ArticleCategory.objects.all()

    return render_template('article/index.html', {
        'articles': article,
        'pending_articles': pending_articles,
        'all_article_category': all_article_category
    })


def view(request, article_pk, article_slug):
    """Show the given article if exists and is visible.

    Returns:
        HttpResponse

    """
    article = get_object_or_404(Article, pk=article_pk)

    if not article.is_visible and not request.user == article.author \
       and not (article.is_beta and request.user.is_authenticated()) \
       and not request.user.has_perm('article.change_article'):
        raise PermissionDenied

    if article_slug != slugify(article.title):
        return redirect(article.get_absolute_url())

    return render_template('article/view.html', {
        'article': article,
        'prev': get_prev_article(article),
        'next': get_next_article(article)
    })


def download(request):
    """Download an article.

    Returns:
        HttpResponse

    """
    import json

    article_pk = request.GET.get('article', None)

    if article_pk is None:
        return HttpResponseBadRequest()

    try:
        article_pk = int(article_pk)
    except ValueError:
        return HttpResponseBadRequest()

    article = get_object_or_404(Article, pk=article_pk)

    if not article.is_visible and not request.user == article.author:
        raise PermissionDenied

    dct = export_article(article, validate=False)
    data = json.dumps(dct, indent=4, ensure_ascii=False)

    response = HttpResponse(data, content_type='application/json')
    response['Content-Disposition'] = 'attachment; filename={0}.json'\
        .format(article.slug)

    return response


@login_required
def new(request):
    """Create a new article.

    Returns:
        HttpResponse

    """
    if request.method == 'POST':
        form = NewArticleForm(request.POST, request.FILES)
        if form.is_valid():
            data = form.data

            article = Article()
            article.title = data['title']
            article.description = data['description']
            article.author = request.user
            if 'image' in request.FILES:
                article.image = request.FILES['image']

            # Since the article is not published yet, this value isn't
            # important (will be changed on publish)
            article.pubdate = datetime.now()

            category = ArticleCategory.objects.get(pk=int(data['category']))
            if category:
                article.category = category

            # First save before tags because they need to know the id of the
            # article
            article.save()


            list_tags = data['tags'].split(',')
            for tag in list_tags:
                article.tags.add(tag.strip())
            article.save()
            return redirect(''.join((reverse('pdp.article.views.edit'),
                            '?article={}'.format(article.pk))))
    else:
        form = NewArticleForm()

    return render_template('article/new.html', {
        'form': form
    })


@login_required
def edit(request):
    """Edit an article.

    This will use the 'article' GET field to find out which article to edit.

    Returns:
        HttpReponse

    """
    try:
        article_pk = request.GET['article']
    except KeyError:
        raise Http404

    article = get_object_or_404(Article, pk=article_pk)

    # Make sure the user is allowed to do it
    if not request.user == article.author:
        raise PermissionDenied

    if request.method == 'POST':
        form = EditArticleForm(request.POST, request.FILES)
        if form.is_valid():
            data = form.data

            article.title = data['title']
            article.description = data['description']
            article.text = data['text']
            if 'image' in request.FILES:
                article.image = request.FILES['image']

            article.tags.clear()
            list_tags = data['tags'].split(',')
            for tag in list_tags:
                article.tags.add(tag.strip())

            article.save()

            # If the article was on the home page, update it
            if article in get_last_articles():
                template_cache_delete('home-articles')

            return redirect(article.get_absolute_url())
    else:
        # initial value for tags input
        list_tags = ''
        first_tag = True
        for tag in article.tags.all():
            if first_tag:
                first_tag = False
            else:
                list_tags += ', '
            list_tags += tag.__str__()

        form = EditArticleForm({
            'title': article.title,
            'description': article.description,
            'text': article.text,
            'tags': list_tags,
        })

    return render_template('article/edit.html', {
        'article': article, 'form': form
    })


@require_POST
@login_required
def modify(request):
    """Modify an article.

    This view will only accept POST forms with valid CSRF field to ensure CSRF
    protection.


    Returns:
        HttpResponse (will mainly redirect to the article itself once action
        performed)

    """
    data = request.POST

    article_pk = data['article']
    article = get_object_or_404(Article, pk=article_pk)

    # Validator actions
    if request.user.has_perm('article.change_article'):

        # We can't validate a non-pending article
        if 'validate' in request.POST:
            if not article.is_pending:
                raise PermissionDenied

            article.is_pending = False
            article.is_beta = False
            article.is_visible = True
            article.pubdate = datetime.now()
            article.save()

            # We create a topic on forum for feedback
            if BOT_ENABLED:
                bot.create_article_topic(article)

            # We update home page article cache
            template_cache_delete('home-articles')

            return redirect(article.get_absolute_url())

        if 'refuse' in request.POST:

            # We can't refuse a non-pending article
            if not article.is_pending:
                raise PermissionDenied

            article.is_pending = False
            article.save()

            return redirect(article.get_absolute_url())

    # User actions
    if request.user == article.author:
        if 'delete' in data:
            article.delete()
            return redirect('/articles/')

        if 'pending' in data:
            if article.is_pending:
                raise PermissionDenied

            article.is_pending = True
            article.save()

        if 'beta' in data:
            article.is_beta = not article.is_beta
            article.save()

    return redirect(article.get_absolute_url())


def find_article(request, name):
    """Find all articles written by an author.

    The author name is extracted from the URL.

    Returns:
        HttpResponse

    """
    u = get_object_or_404(User, username=name)

    articles = Article.objects.all()\
        .filter(author=u)\
        .filter(is_visible=True)\
        .order_by('-pubdate')

    return render_template('article/find_article.html', {
        'articles': articles, 'usr': u,
    })


def tags(request):
    return render_template('article/tags.html')


def tag(request, name):

    articles = Article.objects\
        .filter(is_visible=True)\
        .filter(tags__name__in=[name])\
        .order_by('-pubdate')

    return render_template('article/tag.html', {
        'tagname': name,
        'articles': articles,
    })


def category(request, name):
    if name == 'tous':
        category = ArticleCategory(title=u'Tout les articles',slug=u'tous')
        articles = Article.objects.filter(is_beta=False, is_visible=True).order_by('-pubdate')
    elif name == 'beta':
        category = ArticleCategory(title=u'Bêta',slug=u'beta')
        articles = Article.objects.filter(is_beta=True).order_by('-pubdate')
    else:
        category = get_object_or_404(ArticleCategory, slug=name)
        articles = Article.objects.filter(category=category, is_beta=False, is_visible=True).order_by('-pubdate')

    all_category = ArticleCategory.objects.all()
    return render_template('article/category.html',{
        'category': category,
        'all_category': all_category,
        'articles': articles
    })


# Deprecated URLs

def deprecated_view_redirect(request, article_pk, article_slug):
    article = get_object_or_404(Article, pk=article_pk)
    return redirect(article.get_absolute_url(), permanent=True)
