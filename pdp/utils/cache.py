# coding: utf-8
#
# This file is part of Progdupeupl.
#
# Progdupeupl is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# Progdupeupl is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with Progdupeupl. If not, see <http://www.gnu.org/licenses/>.

"""Useful fonctions for dealing with Django's cache system."""

from hashlib import md5

from django.core.cache import cache
from django.core.cache.utils import make_template_fragment_key


def template_cache_delete(fragment_name, vary_on=None):
    """Delete the template cached content.

    Args:
        fragment_name: name of the template cached fragment
        vary_on: list of arguments

    """
    cache.delete(make_template_fragment_key(fragment_name, vary_on))
