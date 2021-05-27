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

    let setCurrentSnippetUrl = function(snippet){
        let hash = hashFnv32a(snippet.id, true, appSettings.config.hashSeed);
        history.pushState({id: snippet.id}, snippet.title, "?view=" + snippet.id + hash);
    }


    let getCurrentSnippetIdFromUrl = function(){
        const urlParams = new URLSearchParams(window.location.search);
        let hashedDocId = urlParams.get('view');
        if (!hashedDocId) 
            return null;

        let urlHash = hashedDocId.substr(-8);
        let docId = hashedDocId.substr(0, hashedDocId.length - 8);
        // rehash again to check for integrity
        if (urlHash == hashFnv32a(docId, true, appSettings.config.hashSeed)) 
            return docId;
        return null;
    }

    return {
        createEmptySnippet: createEmptySnippet,
        logme: logme,
        // return: errors[]
        validateNote: validateNote,
        // return: errors[]
        validateSnippet: validateSnippet,
        setCurrentSnippetUrl: setCurrentSnippetUrl,
        getCurrentSnippetIdFromUrl: getCurrentSnippetIdFromUrl
    }
})();

