// tutorial: firebase basics
// https://www.youtube.com/watch?v=q5J5ho7YUhA&ab_channel=Fireship
const db = firebase.firestore();
let dbNotesRef = db.collection('notes');
// User Authentication
const auth = firebase.auth();
const googleAuthProvider = new firebase.auth.GoogleAuthProvider();
Vue.use(hljs.vuePlugin);
Vue.use(VueToast);// https://www.npmjs.com/package/vue-toast-notification
Vue.component('modal_note', modalGeneric);
Vue.component('modal_confirm', modalGeneric);
// markdown init
let htmlConverter = new showdown.Converter({literalMidWordUnderscores: true, tables: true,noHeaderId: false, openLinksInNewWindow: true, strikethrough: true});

let self;
var vm = new Vue({
    created: function(){
      self = this; // preserve this scope for async functions
      console.log("vue created");
      // load defaults
      self.loadStatesFromStorage();
    },
    data: {
        config: appSettings.config,
        enums: appSettings.enums,
        model: {
            user: null,
            errors: [],
            notes: [], // all notes
            currentNote: null,
            currentNoteInEditor: null, // for edit mode
            currentSnippet: null,
            currentSnippetInEditor: null, // for edit mode, leave original intact in case of cancellation
            codeMirrorRef: null, // reference for code mirror, we need it to retrieve non-highlighted editor content before saving
            notesUsubscribe: null,
            searchText: null, // search text
            searchResults: null,
            updateOrderForNotes: [], // reorder is updated after note save
            editorCharCount: 0
      },
      state:{
          showModalNote: false,
          showModalConfirm: false,
          showZebraStripes: false,
          skin: appSettings.enums.skin.light
      }
    },
    computed:{
        inSearchMode: function(){
            return this.model.searchResults != null;
        },
        editingSnippet: function(){
            return this.model.currentSnippetInEditor != null;
        },
        filteredNotes: function(){
            var rootNotes = this.model.notes.filter(x => !x.parent);
            // rootNotes.sort(function(a, b)  {
            //     if (!isNaN(a.order) && isNaN(b.order)) return -1;
            //     if (isNaN(a.order) && !isNaN(b.order)) return 1;
            //     if (!isNaN(a.order) && !isNaN(b.order)) return a.order - b.order;
            //     return a.title.localeCompare(b.title);
            // });
            this.sortNotebooks(rootNotes);
            return rootNotes;
        },
        filteredSnippets: function(){
            if (this.model.currentNote)
                return this.model.notes.filter(x => x.parent == this.model.currentNote.id);
            return [];
        }
    },
    watch: {
    },
    methods:{
        resetErrors: function(){
            this.model.errors = [];
        },
        selectNotebook: function(note){
            if (note && typeof(note.color) === 'undefined')
                note.color = 'transparent';
            if (note.id != "searchTmp")
                this.resetSearch();
            this.model.currentNote = note;
        },
        createNotebook: function(){
            let snippet = glista.createEmptySnippet();
            snippet.order = self.filteredNotes.length + 1;
            this.editNotebook(snippet);
        },
        editNotebook: function(snippet){
            if (!snippet){
                this.model.currentNoteInEditor = null;
                this.state.showModalNote = false;
            } else {
                this.model.currentNoteInEditor = this.cloneDeep(snippet);
                this.state.showModalNote = true;
                this.$nextTick(() => this.$refs.noteTitle.focus());
                //this.model.notes.push(snippet);
                //this.sortNotes(this.model.notes);  
            }
            this.resetErrors();
        },
        deleteNotebookConfirm: function(){
            this.state.showModalConfirm = true;
        },
        deleteNotebook: function(snippet){
            if(!snippet) return Promise.reject('No id!');
            let parentId = snippet.id;
            // find children
            let ids = this.model.notes.filter(x => x.parent == parentId).map(x => x.id);
            ids.push(parentId); // add parent
            
            let batch = db.batch();
            ids.forEach((id) => {
                let docRef = dbNotesRef.doc(id);
                batch.delete(docRef);
            });
            batch.commit()
            .then(function(){
                // osvjezi UI
                ids.forEach( id => {
                    let itemIndex = self.model.notes.findIndex(x => x.id == id);
                    self.model.notes.splice(itemIndex,1);
                });
                self.selectNotebook(null);
                self.state.showModalConfirm = false;
                self.editNotebook(null);
                self.feedbackOk('Snippets deleted.');
            })
            .catch(function(error){
                self.feedbackError(error, 'Error in batch delete.');
            });
        },
        saveNotebook: function(){
            var snippet = this.model.currentNoteInEditor;
            this.model.errors = glista.validateNote(snippet, appSettings.enums.noteType.note);
            if (this.model.errors.length > 0)
                return;

            if (!snippet.id){
                // insert. set will overwrite whole object if exists
                dbNotesRef.add(
                    snippet
                )
                .then(function(docRef) {
                    snippet.id = docRef.id; // update id from db
                    self.onNoteSave(snippet, "Note created.")
                })
                .catch(function(error) {
                    self.feedbackError(error, "Error creating note.");
                });
            } else {
                // update
                var docRef = dbNotesRef.doc(snippet.id);
                // update = update, set = insert. set will overwrite whole object if exists
                docRef.update({
                    title: snippet.title,
                    parent: snippet.parent,
                    color: snippet.color,
                    order: snippet.order
                })
                .then(function() {
                    self.onNoteSave(snippet, "Note successfully updated.")

                    while (self.model.updateOrderForNotes.length > 0){ 
                        let note = self.model.updateOrderForNotes[0];
                        var docRef = dbNotesRef.doc(note.id);
                        docRef.update({
                            order: note.order,
                        })
                        .then(function() {
                            //console.log('saved', note.id);
                        });
                            
                        self.model.updateOrderForNotes.splice(0,1);
                    }
                })
                .catch((error) => {
                    self.feedbackError(error, "Error updating note.");
                });
                // refresh values in UI
                var note = this.model.notes.find(x => x.id == snippet.id);
                _.merge(note, snippet);
            }
        },
        // feedback and refresh items on screen
        onNoteSave: function(snippet, msg){
            // should be loaded from db
            let created = self.model.currentNote?.id == null || snippet.id != self.model.currentNote?.id; // created or cloned
            if (!created){
                // existing snippet, update valus
                //_.merge(self.model.currentNote, snippet);
                self.model.currentNote = snippet;
            } else {
                // if snippet was created, append it to snippets list
                self.model.notes.unshift(snippet); // insert snippet to other notes snippets at the beginning of the array
                self.selectNotebook(snippet);
            }
            self.sortNotes(self.model.notes); // reorder
            self.editNotebook(null);
            self.feedbackOk('Note saved.');
        },

        createSnippet: function(){
            // check if already editing new snippet
            let snippet = glista.createEmptySnippet();
            snippet.parent = self.model.currentNote.id;
            self.selectSnippet(snippet); // select new snippet
            self.editSnippet(snippet);// immediately open in editor
        },
        selectSnippet: function(snippet){
            this.editSnippet(null); // hide editor
            // highlighter rebuilds  pre > code element and vue is not registering content change
            // destroy and rerender dom element with if (set model to null, and again to model)
            this.model.currentSnippet = null;
            if (snippet){
                this.$nextTick().then(() => {
                    this.model.currentSnippet = snippet;
                    this.initSnipetViewer(snippet);
                    if (snippet.id)
                        glista.setCurrentSnippetUrl(snippet); // dont trigger on create snippet
                });
            }
        },
        // things to do in viewer
        initSnipetViewer: function(snippet){
            if (!snippet) return;
            
            //this.$nextTick().then(() => {
                //this.model.currentSnippet = snippet;
                if (snippet.lang == this.enums.lang.markdown){
                    this.$nextTick().then(() => {
                        mermaid.init();                        
                    });
                }else {
                    this.highlightCode(snippet);
                }
           // });
        },
        // highlight presentation code in viewer
        highlightCode: function(snippet){
            // console.log('highlightCode', snippet ? snippet.lang : null);
            if (!snippet) return;
            //this.$nextTick().then(() => {
                // highlighter rebuilds  pre > code element and vue is not registering content change
                // destroy and rerender dom element with if (set model to null, and again to model)
                // also, highlight after rendering content
                setTimeout(() => {
                    hljs.highlightAll();
                }, 100);
              //});
            // for multiple files we might need this
            // document.querySelectorAll('#snippet .content pre code').forEach((block) => {
            //     console.log(block);
            //     hljs.highlightBlock(block);
            // });
            // hljs.highlightAll();
            // self.$forceUpdate();
        },
        // open snippet in editor. content is cloned from current snippet so we can restore it on cancel without rereading it from db
        editSnippet: function(snippet){
            if (!snippet){
                // cancel btn
                if (this.model.codeMirrorRef){
                    this.model.codeMirrorRef.off('change');
                    this.model.codeMirrorRef.toTextArea(); // prevent submit handler memory leak
                }
                this.model.currentSnippetInEditor = null; // hide editor
                this.$nextTick(() => {
                    // wait until model changes then rerun init to run highlighter again (DOM was destroyed and rewritten)
                    this.initSnipetViewer(this.model.currentSnippet);
                });
            } else {
                this.model.currentSnippetInEditor = this.cloneDeep(snippet) // edit
                //vm.$forceUpdate();
                //vm.$nextTick().then(() => {
                //this.loadCodeEditor(snippet);
                //});
                setTimeout(() => {
                    self.loadCodeEditor(snippet);
                    this.$nextTick(() => this.$refs.formTitle.focus());

                }, 100);
            }
            this.resetErrors();
        },
        cloneSnippet: function(snippet){
            if (confirm(`Clone ${snippet.title}?`)){
                if (this.editingSnippet){
                    this.model.currentSnippetInEditor = this.cloneDeep(this.model.currentSnippetInEditor);
                    this.model.currentSnippetInEditor.id = null;
                    this.model.currentSnippetInEditor.title +=" clone"; 
                } else if(this.model.currentSnippet) {
                    this.model.currentSnippetInEditor = this.cloneDeep(this.model.currentSnippet);
                    this.model.currentSnippetInEditor.id = null;
                    this.editSnippet(this.model.currentSnippetInEditor);
                }
            }
        },
        // highlight code in editor
        loadCodeEditor: function(snippet){
            // codemirror init https://codemirror.net/doc/manual.html
            this.model.codeMirrorRef = CodeMirror.fromTextArea(document.getElementById("formContent"), {
                lineNumbers: true,
                tabSize: 4,
                indentUnit: 4,
                mode: this.getSnippetEditorLang(snippet),
            });
            this.model.codeMirrorRef.on('change', (editor) => {
                this.model.editorCharCount = editor.doc.getValue().length;
              });
            this.model.editorCharCount = this.model.codeMirrorRef.doc.getValue().length;// init
            this.model.codeMirrorRef.getScrollerElement().style.minHeight = '300px';
            this.model.codeMirrorRef.refresh();
        },
        saveSnippet: function(){
            var snippet = this.model.currentSnippetInEditor;
            if (!this.model.codeMirrorRef) console.error('codeMirrorRef not loaded!');
            snippet.content = this.model.codeMirrorRef.doc.getValue(); // get non-highlighted text
            
            this.model.errors = glista.validateNote(snippet, appSettings.enums.noteType.snippet);
            if (this.model.errors.length > 0)
                return;

            if (!snippet.id){
                // insert. set will overwrite whole object if exists
                dbNotesRef.add(
                    snippet
                )
                .then(function(docRef) {
                    snippet.id = docRef.id; // update id from db
                    self.onSnippetSave(snippet, "Document successfully added.")
                })
                .catch(function(error) {
                    self.feedbackError(error, "Error adding document.");
                });
            } else {
                // update
                var docRef = dbNotesRef.doc(snippet.id);
                // update = update, set = insert. set will overwrite whole object if exists
                docRef.update({
                    title: snippet.title,
                    parent: snippet.parent,
                    description: snippet.description || '',
                    lang: snippet.lang || '',
                    favorite: snippet.favorite || false,
                    content: snippet.content || ''
                })
                .then(function() {
                    self.onSnippetSave(snippet, "Document successfully updated.")
                })
                .catch((error) => {
                    self.feedbackError(error, "Error updating document.");
                });
            }
        },
        toggleSnippetFavorite: function(snippet){
            snippet.favorite = !snippet.favorite;
            var docRef = dbNotesRef.doc(snippet.id);
            // update = update, set = insert. set will overwrite whole object if exists
            docRef.update({
                favorite: snippet.favorite,
            })
            .then(function() {
                self.onSnippetSave(snippet, "Document successfully updated.")
            })
            .catch((error) => {
                self.feedbackError(error, "Error updating document.");
            });
        },
        // feedback and refresh items on screen
        onSnippetSave: function(snippet, msg){
            // refresh edited item in list with edited values
            // should be loaded from db
            let created = this.model.currentSnippet.id == null || snippet.id != this.model.currentSnippet.id; // created or cloned
            if (!created){
                // existing snippet, update values
                _.merge(this.model.currentSnippet, snippet);
            } else {
                // if snippet was created, append it to snippets list
                self.model.notes.unshift(snippet); // insert snippet to other notes snippets at the beginning of the array
                this.selectSnippet(snippet);// select clone
            }
            this.sortNotes(self.model.notes); // reorder
            this.editSnippet(null);
            this.highlightCode(snippet);
            self.feedbackOk('Snippet saved.');
        },
        deleteSnippet: function(snippet){
            // Warning: Deleting a document does not delete its subcollections!
            if (confirm(`Delete ${snippet.title}?`)){
                dbNotesRef.doc(snippet.id)
                .delete()
                .then(() => {
                    // osvjezi UI
                    let itemIndex = self.model.notes.findIndex(x => x.id == snippet.id);
                    self.model.notes.splice(itemIndex,1);
                    self.selectSnippet(null);
                    // doesnt refresh vue UI
                    //_.remove(self.model.notes, function(x) { return x.id == snippet.id});
                    //self.$forceUpdate();
                    self.feedbackOk('Snippet deleted.');
                }).catch((error) => {
                    self.feedbackError(error, "Error removing document");
                });
            }
        },
        moveSnippet: function(parentId){
            self.model.currentSnippetInEditor.parent = parentId;
        },
        onAuthStateChanged: function(user){
            console.log('onAuthStateChanged', user);

            if (user){
                this.model.user = user;
                this.loadNotes(user);
            } else {
                this.model.user = null;
                // reset
                this.model.notes = [];
                this.model.user = null;
                this.model.currentNote = null;
                this.model.currentNoteInEditor = null;
                this.model.currentSnippet = null;
                this.model.currentSnippetInEditor = null;
                // clear url
                const url = new URL(location);
                url.searchParams.delete('view');
                history.replaceState(null, null, url);
            }
        },
        loadNotes: function(user){
            let self = this;
            // https://firebase.google.com/docs/firestore/query-data/get-data
            // Database Reference
            collNotes = dbNotesRef
            .where('uid', '==', user.uid)
            //.where('parent', '!=', null )
            .get()
            .then((querySnapshot) => {
                var items = [];
                querySnapshot.forEach((doc) => {
                    // build list
                    // doc.data() is never undefined for query doc snapshots
                    var note = doc.data();
                    note.id = doc.id;
                    note.order = isNaN(note.order) ? 0 : note.order; // default value
                    items.push(note);
                });

                self.model.notes = this.sortNotes(items);

                // restore last view
                let id = glista.getCurrentSnippetIdFromUrl();
                if (id)
                    this.restoreLastView(id);
            })
            .catch((error) => {
                self.feedbackError(error, "Error getting documents.");
            });
        },
        
        restoreLastView: function(id){
            if (!id) return;
            let snippet = this.model.notes.find(x => x.id == id);
            if (snippet){
                let parent = this.model.notes.find(x => x.id == snippet.parent);
                this.selectNotebook(parent);
                this.selectSnippet(snippet);
            } else {
                // public snippet from other user?
            }
        },
        sortNotes: function(notes){
            return notes.sort(function(a, b)  {
                if (a.favorite && !b.favorite) return -1;
                if (!a.favorite && b.favorite) return 1;
                return a.title.localeCompare(b.title);
            });
        },
        sortNotebooks: function(notebooks){
            notebooks.sort(function(a, b)  {
                if (!isNaN(a.order) && isNaN(b.order)) return -1;
                if (isNaN(a.order) && !isNaN(b.order)) return 1;
                if (!isNaN(a.order) && !isNaN(b.order)) return a.order - b.order;
                return a.title.localeCompare(b.title);
            });
        },
        onSignOut: function(){
            auth.signOut();
        },
        onGoogleSignIn: function(){
            auth.signInWithPopup(googleAuthProvider);
        },
        onEmailPassSignIn: function(){
            let email = 'someemail@gmail.com';
            let password = 'banana123';
            auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
            // Signed in
                var user = userCredential.user;
                console.log('signed in', user, userCredential);
            })
            .catch((error) => {
                console.log('SignIn error', error);
            });
        },
        adjustViewerFontSize: function(sizeAdjustment){
            // check if we have saved size
            let newSize = null;
            if (!sizeAdjustment && localStorage.getItem(this.enums.storage.viewerFontSize) != null){
                newSize = parseInt(localStorage.getItem(this.enums.storage.viewerFontSize));
            }
            if (!sizeAdjustment && !newSize) return;
            
            let viewerColl = document.querySelectorAll("#snippet .content");
            let viewer = viewerColl && viewerColl[0] ? viewerColl[0]: null; // take just first instance for now
            if (viewer){
                if (sizeAdjustment){
                    let oldSize = window.getComputedStyle(viewer, null).getPropertyValue('font-size');
                    newSize = parseFloat(oldSize) + sizeAdjustment;
                }
                // using css custom property
                // setting it through style will apply it after rendering making content jerky
                document.documentElement.style.setProperty("--content-font-size", newSize + 'px');
                document.documentElement.style.setProperty("--viewer-code-striped-height", Math.floor(Math.floor(newSize * 1.4) * 4) + 'px');// 1.4 == line height
                localStorage.setItem('viewerFontSize', newSize); // remember
            }
        },
        copyToClipboard: function(){
            let text = '';
            if(this.editingSnippet){
                text = this.model.codeMirrorRef.doc.getValue()
            } else {
                text = vm.model.currentSnippet.content
            }
            var promise = navigator.clipboard.writeText(text);
            self.feedbackOk('Content copied to clipboard.');
        },
        getChildCount: function(note){
            return this.model.notes.filter(x => x.parent == note.id).length;
        },
        feedbackOk: function(msg){
            Vue.$toast.open(msg);
        },
        feedbackError: function(error, msg){
            if (error)
                console.error(msg || 'Error', error);
            Vue.$toast.open({
                message: msg,
                type: 'error', // success, info, warning, error, default
            });
        },
        getSnippetLang: function(snippet){
            return snippet && snippet.lang ? snippet.lang : 'autodetect';
        },
        // some overrides for languages which are text
        showZebraStripes: function(snippet){
            if (!snippet.lang || ['autodetect', 'text', 'plaintext'].includes(snippet.lang.toLowerCase()))
                return false;
            return this.state.showZebraStripes ? true : false;
        },
        getSnippetEditorLang: function(snippet){
            // mapper to codemirror langs
            if (!snippet || !snippet.lang)
                return 'javascript'; // default
            switch (snippet.lang){
                case 'autodetect': return 'javascript';
                case 'plaintext': return 'markdown';
                case 'markdown': return 'markdown';
                case 'csharp': return 'clike';
                case 'javascript': return 'javascript';
                case 'sql': return 'sql';
                case 'json': return 'javascript';
                case 'python': return 'python';
                case 'css': return 'css';
                case 'html': return 'htmlmixed';
            }
            return 'markdown';
        },
        cloneDeep: function(obj){
            return _.cloneDeep(obj);
        },
        runSearch: function(){
            if (this.model.searchText.length == 0) return;
            let text = this.model.searchText.toLowerCase();
            // put search results under virtual note
            let resContainer = glista.createEmptySnippet();
            resContainer.id = 'searchTmp';
            resContainer.title = 'Search results';
            let res = [];
            let titles = []; // text found in title
            let contents = []; // text found in content
            for(let i=0,j=this.model.notes.length;i<j;i++){
                if (this.model.notes[i].title && this.model.notes[i].title.toLowerCase().indexOf(text) > -1){
                    let snippet = this.cloneDeep(this.model.notes[i]);
                    titles.push(snippet);
                } else if (this.model.notes[i].content && this.model.notes[i].content.toLowerCase().indexOf(text) > -1) {
                    let snippet = this.cloneDeep(this.model.notes[i]);
                    contents.push(this.model.notes[i]);
                }
            }
            res.push(...titles);
            res.push(...contents);
            this.selectNotebook(resContainer);
            if (res.length > 0){
                this.model.searchResults = res;
            } else {
                this.feedbackError(null, 'No results for ' + text);
                this.model.searchResults = [];
            }
        },
        resetSearch: function(){
            this.model.searchResults = null; // reset
            this.model.searchText = '';
        },
        getSnippetParentTitle: function(snippet){
            let parent = this.model.notes.find(x => x.id == snippet.parent);
            return parent ? parent.title : '';
        },
        toggleZebraStripes: function(){
            this.state.showZebraStripes = !this.state.showZebraStripes;
            localStorage.setItem(this.enums.storage.showZebraStripes, this.state.showZebraStripes);
        },
        loadStatesFromStorage: function(){
            this.adjustViewerFontSize();

            if (localStorage.getItem(this.enums.storage.showZebraStripes) != null)
                this.state.showZebraStripes = localStorage.getItem(this.enums.storage.showZebraStripes).toLowerCase() == "true";
                
            if (localStorage.getItem(this.enums.storage.skin) != null)
                this.state.skin = localStorage.getItem(this.enums.storage.skin);
            
        },
        toggleSkin: function(){
            this.state.skin = this.state.skin == this.enums.skin.darkblue ? this.enums.skin.light : this.enums.skin.darkblue;

            localStorage.setItem(this.enums.storage.skin, this.state.skin);
        },
        // snippet color for dot before name
        getNotebookColor: function(note){
            // lavender '#e6e6fa' darkblue #142b40 lightgray #efefef
            if (note.color)
                return note.color;
            return 'transparent';
            //return this.state.skin == this.enums.skin.light ? '#efefef': '#142B40';
        },
        // for gradients, transparent will default to gray
        getSnippetColor: function(snippet) {
            if (!snippet || snippet.color == 'transparent')
                return '#cccccc';// 6 chars so we can add transparency
            return snippet.color;
        },
        getNoteHeaderStyle: function(editingSnippet, currentSnippet, currentNote){
            // :style="[{'border-bottom': '3px solid '+ getSnippetColor(model.currentNote)}, {'box-shadow': '0px 2px 8px 1px '+ getSnippetColor(model.currentNote)+'40'}, {'background': 'linear-gradient(9deg, '+ getSnippetColor(model.currentNote) +'40, #fff 30%)'}]"
            // let bgcolor = this.getSnippetColor(currentNote);
            let bgcolor = this.getSnippetColor(currentNote);
            return [{'border-bottom': '3px solid '+ bgcolor}, {'box-shadow': '0px 2px 8px 1px '+ bgcolor +'40'}, {'background': 'linear-gradient(9deg, '+ bgcolor +'50, #fff 30%)'}];
        },
        getSnippetHeaderStyle: function(editingSnippet, currentSnippet, currentNote){
            // let bgcolor = this.getSnippetColor(currentNote);
            let bgcolor = 'transparent';
            if (currentSnippet){
                var parent = this.filteredNotes.find(n => n.id == currentSnippet.parent);
                bgcolor = this.getSnippetColor(parent);
            }
            if (window.innerWidth > 991){
                // inline :style="getSnippetHeaderStyle(editingSnippet, model.currentSnippet, model.currentNote)[{'border-bottom': '3px solid '+ getSnippetColor(model.currentNote)}, {'box-shadow': '0px 2px 8px 1px '+ getSnippetColor(model.currentNote)+'40'}, {'background': 'linear-gradient(9deg, '+ getSnippetColor(model.currentNote) +'20, #fff 30%)'}]">
                // style will override editing yellow mode so we are conditioning it here
                if (editingSnippet)
                    return [{'border-bottom': '3px solid '+ bgcolor}];
                // gradient mode
                return [{'border-bottom': '3px solid '+ bgcolor}, {'box-shadow': '0px 2px 8px 1px '+ bgcolor +'40'}, {'background': 'linear-gradient(9deg, '+ bgcolor +'30, #fff 30%)'}];
            } else {
                // full color mode to make separation of snippet/list more obvious
                return [{'border-bottom': '3px solid '+ bgcolor}, {'box-shadow': '0px 2px 8px 1px '+ bgcolor +'40'}, {'background': 'linear-gradient(90deg, '+ bgcolor +'55, #fff 80%)'}];
            }
        },
        // move up/down
        reorderNotebook(notebook, direction){
            // swap places, then build order
            let rootNotes = this.model.notes.filter(x => !x.parent);
            this.sortNotebooks(rootNotes); // for consequtive reorders update current state
            let ix = rootNotes.findIndex(x => x.id == notebook.id);
            let targetIndex = direction > 0 ? ix + 1 : ix -1;
            if (targetIndex >=0 && targetIndex <= (rootNotes.length - 1)){
                let tmp = rootNotes[ix];
                rootNotes[ix] = rootNotes[targetIndex];
                rootNotes[targetIndex] = tmp;
            }
            
            // update original
            let notesToUpdate = [];
            for(let i=0, j= rootNotes.length; i<j;i++){
                notesToUpdate.push(rootNotes[i]);
                let note = this.model.notes.find(x => x.id == rootNotes[i].id);
                note.order = i + 1;
                if (rootNotes[i].id == notebook.id)
                    notebook.order = i + 1;
            }

            // persist rest on note save
            this.model.updateOrderForNotes = notesToUpdate;
        }
    },
  }).$mount("#app");


auth.onAuthStateChanged(user => vm.onAuthStateChanged(user));
