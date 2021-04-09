let glista = (function(){

    let createEmptySnippet = function(){
        let snippet = {
            uid: self.model.user.uid,
            id: null,
            parent: '',
            title: '',
            description: '',
            lang: '',
            tags: [],
            color: '',
            favorite: false,
            order: 0
        };
        return snippet;
    }

     // log proxy
    let logme = function(a){
        console.log.apply(this, arguments);
    }

    // lets keep validation for both in one place and adjust on noteType
    let validateNote = function(item, noteType){
        let errors = [];
        if (!item.uid) errors.push('Uid is mandatory');
        if (!item.title) errors.push('Title is mandatory');
        if (noteType == appSettings.enums.noteType.note){
            if (item.title && item.title.length > appSettings.config.validation.noteTitleMaxLength) errors.push('Title max length is ' + appSettings.config.validation.noteTitleMaxLength);
        } else {
            if (item.title && item.title.length > appSettings.config.validation.snippetTitleMaxLength) errors.push('Title max length is ' + appSettings.config.validation.snippetTitleMaxLength);
        }
        if (item.description && item.description.length > appSettings.config.validation.descriptionMaxLength) errors.push('Description max length is ' + appSettings.config.validation.descriptionMaxLength);
        if (item.content && item.content.length > appSettings.config.validation.contentMaxLength) errors.push('Content max length is ' + appSettings.config.validation.contentMaxLength);
        
        return errors;
    }
    
    // return: errors[]
    let validateNotebook = function(item){
        return validateNote(item, appSettings.enums.noteType.note);
    }
    
    // return: errors[]
    let validateSnippet = function(snippet){
        return validateNote(item, appSettings.enums.noteType.snippet);
    }

    return {
        createEmptySnippet: createEmptySnippet,
        logme: logme,
        // return: errors[]
        validateNote: validateNote,
        // return: errors[]
        validateSnippet: validateSnippet
    }
})();

// utils

/**
 * Number.prototype.format(n, x, s, c)
 * 
 * @param integer n: length of decimal
 * @param integer x: length of whole part
 * @param mixed   s: sections delimiter
 * @param mixed   c: decimal delimiter
 */
Number.prototype.format = function(n, x, s, c) {
    var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\D' : '$') + ')',
        num = this.toFixed(Math.max(0, ~~n));

    return (c ? num.replace('.', c) : num).replace(new RegExp(re, 'g'), '$&' + (s || ','));
};
