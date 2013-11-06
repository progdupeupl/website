
if (typeof String.prototype.startsWith != 'function') {
	String.prototype.startsWith = function (str) {
		return this.indexOf(str) == 0;
	};
}



/*
function setFocusToSubmitButton() {
	var submit_button = document.getElementById("id_submit_button");
	submit_button.focus();
}
*/

var indentString = "    ";


/*
function getSelectedLines(lines, selectionStart, selectionEnd) {

	var selectedLines = [];
	var lineStart = 0, lineEnd;

	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];
		lineEnd = lineStart + line.length;
		if (lineStart <= selectionEnd && lineEnd >= selectionStart) {
			selectedLines.push(line);
		}
		lineStart = lineEnd + 1; // 1 is the line feed character
	}

	return selectedLines;
}
*/



/* Returns an object which contains the selection bounds */
function getLineSelection(lines, selectionStart, selectionEnd) {

	var selection = {
		start: -1,
		end: -1,
	};

	var lineStart = 0, lineEnd;

	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];
		lineEnd = lineStart + line.length;
		if (lineStart <= selectionEnd && lineEnd >= selectionStart) {
			if (selection.start == -1) {
				selection.start = i;
			}
		} else {
			if (selection.start != -1) {
				selection.end = i - 1;
				return selection;
			}
		}

		lineStart = lineEnd + 1; // 1 is the line feed character
	}

	if (selection.start == -1)
		throw "Error";

	selection.end = lines.length - 1;
	return selection;
}



function isLineSelected(lineIndex, lineSelection) {
	return lineSelection.start <= lineIndex && lineSelection.end >= lineIndex;
}



function indentLines(lines) {

	var newLines = [];

	for (var i = 0; i < lines.length; i++) {
		newLines.push(indentString + lines[i] + "\n");
	}

	return newLines;
}



function indentLineSelection(lines, lineSelection) {

	var newLines = [];
	var addedCharCount = 0;

	for (var i = 0; i < lines.length; i++) {
		var newLine = lines[i];
		if (isLineSelected(i, lineSelection)) {
			newLine = indentString + newLine;
			addedCharCount += indentString.length;
		}
		newLines.push(newLine);
	}

	return {
		lines: newLines,
		addedCharCount: addedCharCount,
	};
}


/*
function dedentLines(textArea) {

	var lines = textArea.split("\n");
	var r = "";

	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];
		if (line.startsWith(indentString)) {
			line = line.substring(indentString.length, line.length);
		} else if (line.startsWith(" ") || line.startsWith("\t")) {
			line = line.substring(1, line.length);
		}
		r += indentString + line + "\n";
	}

	return r;
}*/



function textAreaTabPressed(textArea) {

	var scroll = this.scrollTop;

	if(window.ActiveXObject) {

		// TODO
		return true;

	} else {

		if(textArea.selectionStart == textArea.selectionEnd) {
			// Nothing is selected, nothing to indent. Just set the focus to the submit button
			return true;
		}

		var oldSelectionStart = textArea.selectionStart;
		var oldSelectionEnd = textArea.selectionEnd;

		var	lines = textArea.value.split("\n");
		var lineSelection = getLineSelection(lines, textArea.selectionStart, textArea.selectionEnd);
		var res = indentLineSelection(lines, lineSelection);
		var newLines = res.lines;
		var addedCharCount = res.addedCharCount;

		var newText = newLines.join("\n");

		textArea.value = newText;

		textArea.setSelectionRange(oldSelectionStart, oldSelectionEnd + addedCharCount);

		return false;
	}

	textArea.focus();
	textArea.scrollTop = scroll;

	// Annule l'action de la touche "tabulation". (Empêche de sélectionner le lien suivant)
	return false;
}



/* Adds observers on any text area */
function addTabObservers() {

	var textareas = document.getElementsByTagName("textarea");

	for(var i = 0, t = textareas.length; i < t; i++){

		textareas[i].onkeydown = function(e) {
			var isTabDown = (e || window.event).keyCode == 9;
			if (isTabDown) {
				return textAreaTabPressed(this);
			}
		};
	}
}

addTabObservers();



var textar="id_description";
var charriot = String.fromCharCode(13);
var LF = String.fromCharCode(10);

function bold(id_text)
{
	style_encadre(id_text, "**", "**");
}

function italic(id_text)
{
	style_encadre(id_text, "*", "*");
}

function h1(id_text)
{
	style_encadre(id_text, "# ", " #");
}

function h2(id_text)
{
	style_encadre(id_text, "## ", " ##");
}

function h3(id_text)
{
	style_encadre(id_text, "### ", " ###");
}

function link(id_text)
{
	var lien = prompt('Saisissez l\'adresse de votre lien', 'http://');
	style_encadre(id_text, "[", "]("+lien+")");
}

function secret(id_text)
{
	style_encadre(id_text, LF+"[secret]{"+charriot, charriot+"}"+LF);
}

function image(id_text)
{
	var url = prompt('Saisissez l\'url de l\'image', 'http://');
	style_encadre(id_text, "![", "]("+url+")");
}

function bulletlist(id_text)
{
	style_precede(id_text, LF, LF, " - ");
}

function numericlist(id_text)
{
	style_precede(id_text, LF, LF, " 1. ",true);
}

function citation(id_text)
{
	var auteur = prompt('Qui est l\'auteur de la citation ?', '');
	
	if(auteur.trim().length==0)
	{
		style_precede(id_text, LF, LF, "> ");
	}
	else
	{
		style_precede(id_text, LF+"**"+auteur+" a écrit : **"+LF, LF, "> ");
	}
}

function code(id_text)
{
	var code = prompt('Quel est le langage (c, c++, java, python, php, html, ...) ?', '');
	var charriot = String.fromCharCode(13);
	style_encadre(id_text, LF+"```"+code+charriot, charriot+"```"+LF);
} 
function codeline(id_text)
{
	style_encadre(id_text, "`", "`");
}

function style_encadre(id_text, strdeb, strfin) {
	var textarea = document.getElementById(id_text);
	var scroll = textarea.scrollTop;

	if(window.ActiveXObject){
		var textR = document.selection.createRange();
		var selection = textR.text; // On récupère le texte de la sélection
		// On modifie la sélection et on rajoute le texte qu'il faut.
		textR.text = strdeb + selection + strfin;
		// On déplace la sélection du nombre de caractères de la sélection vers la gauche.
		textR.moveStart("character",-selection.length+strfin.length);
		textR.moveEnd("character", strfin.length);
		// On sélectionne le tout
		textR.select();
	}
	else {
		var beforeSelection = textarea.value.substring(0, textarea.selectionStart);
		var selection = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
		var afterSelection = textarea.value.substring(textarea.selectionEnd);
							
		// On modifie le contenu du textarea
		textarea.value = beforeSelection + strdeb + selection + strfin + afterSelection;

		// On modifie la sélection
		textarea.setSelectionRange(beforeSelection.length + strdeb.length, beforeSelection.length + strdeb.length + selection.length);
	}

	textarea.focus(); // Met le focus sur le textarea
	textarea.scrollTop = scroll;
}

function style_precede(id_text, deb, fin, str, numeric) {
	var textarea = document.getElementById(id_text);
	var scroll = textarea.scrollTop;
	var numeric=numeric||false;

	if(window.ActiveXObject){
		var textR = document.selection.createRange();
		var selection = textR.text; // On récupère le texte de la sélection
		// On modifie la sélection et on rajoute le texte qu'il faut.
		
		var destin=str;
		
		for(var i=0;i<selection.length;i++)
		{
			var cpt=1;
			if(selection.charAt(i)==charriot || selection.charAt(i)==LF) 
				{
					if(numeric) {
						cpt=parseInt(cpt)+1;
						destin=destin+selection.charAt(i)+cpt+". ";
					}
					else
					{
						destin=destin+selection.charAt(i)+str;
					}
				}
			else destin=destin+selection.charAt(i)
		}
		
		textR.text = deb + destin + fin;
		
		// On déplace la sélection du nombre de caractères de la sélection vers la gauche.
		// textR.moveStart("character",-selection.length);
		// textR.moveEnd("character", strfin.length);
		// On sélectionne le tout
		// textR.select();
	}
	else {
		var beforeSelection = textarea.value.substring(0, textarea.selectionStart);
		var selection = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
		var afterSelection = textarea.value.substring(textarea.selectionEnd);
		
		var destin=str;
		var cpt=1;

		for(var i=0;i<selection.length;i++)
		{
			if(selection.charAt(i)==charriot || selection.charAt(i)==LF) 
				{
					if(numeric) {
						cpt=parseInt(cpt)+1;
						destin=destin+selection.charAt(i)+" "+cpt+". ";
					}
					else
					{
						destin=destin+selection.charAt(i)+str;
					}
				}
			else destin=destin+selection.charAt(i)
		}
		
		// On modifie le contenu du textarea
		textarea.value = beforeSelection + deb + destin + fin + afterSelection;

		// On modifie la sélection
		textarea.setSelectionRange(beforeSelection.length + deb.length, beforeSelection.length + deb.length + destin.length);
	}

	textarea.focus(); // Met le focus sur le textarea
	textarea.scrollTop = scroll;
}
