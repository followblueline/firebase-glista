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
let htmlConverter = new showdown.Converter({literalMidWordUnderscores: true, tables: true,noHeaderId: false, openLinksInNewWindow: true});

let self;
var vm = new Vue({
    // components:{
    //   'movie-list': cMovieList
    // },
    created: function(){
      self = this; // preserve this scope for async functions
      console.log("vue created");
      // load defaults
      self.loadStatesFromStorage();
    },
    data: {
        config: {
            noteTitleMaxLength: 30,
            snippetTitleMaxLength: 100,
            colors:[
                // https://www.w3schools.com/colors/colors_names.asp
                {name: 'Maroon', code: '#800000'},
                {name: 'Brown', code: '#9a6324'},
                {name: 'Red', code: '#e6194b'},
                {name: 'Orange', code: '#f58231'},
                {name: 'Yellow', code: '#ffe119'},
                {name: 'Lime', code: '#bfef45'},
                {name: 'Green', code: '#3cb44b'},
                {name: 'Dark green', code: '#006400'},
                {name: 'Olive', code: '#808000'},
                {name: 'Teal', code: '#469990'},
                {name: 'Aqua', code: '#00ffff'},
                {name: 'Cyan', code: '#42d4f4'},
                {name: 'Blue', code: '#4363d8'},
                {name: 'Navy', code: '#000075'},
                {name: 'Purple', code: '#911eb4'},
                {name: 'Magenta', code: '#f032e6'},
                {name: 'Hot pink', code: '#ff69b4'},
                {name: 'Pink', code: '#fabed4'},
                {name: 'Apricot', code: '#ffd8b1'},
                {name: 'Beige', code: '#fffac8'},
                {name: 'Mint', code: '#aaffc3'},
                {name: 'Lavender', code: '#dcbeff'},
                {name: 'White', code: '#ffffff'},
                {name: 'Grey', code: '#a9a9a9'},
                {name: 'Light steel blue', code: '#b0c4de'},
                {name: 'Slate grey', code: '#708090'},
                {name: 'Black', code: '#000000'},
                {name: 'Transparent', code: 'transparent'}
            ]
        },
        enums: {
            lang: {
                markdown: 'markdown'
            },
            storage: {
                viewerFontSize: 'viewerFontSize',
                showZebraStripes: 'showZebraStripes',
                skin: 'skin'
            },
            skin: {
                light: 'light',
                darkblue: 'darkblue'
            }
        },
        model: {
            user: null,
            notes: [], // all notes
            currentNote: null,
            currentNoteInEditor: null, // for edit mode
            currentSnippet: null,
            currentSnippetInEditor: null, // for edit mode, leave original intact in case of cancellation
            codeMirrorRef: null, // reference for code mirror, we need it to retrieve non-highlighted editor content before saving
            notesUsubscribe: null,
            searchText: null, // search text
            searchResults: null
      },
      state:{
          showModalNote: false,
          showModalConfirm: false,
          showZebraStripes: false,
          skin: 'light'
      }
    },
    computed:{
        editingSnippet: function(){
            return this.model.currentSnippetInEditor != null;
        },
        filteredNotes: function(){
            return this.model.notes.filter(x => !x.parent);
        },
        filteredSnippets: function(){
            if (this.model.currentNote)
                return this.model.notes.filter(x => x.parent == this.model.currentNote.id);
            return [];
        }
    },
    methods:{
        selectNotebook: function(note){
            if (typeof(note.color) === 'undefined')
                note.color = 'transparent';
            this.model.searchResults = null; // reset
            this.model.currentNote = note;
        },
        createNotebook: function(){
            let snippet = this.createEmptySnippet();
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
                this.feedbackError(error, 'Error in batch delete.');
            });
        },
        saveNotebook: function(){
            var snippet = this.model.currentNoteInEditor;
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
                    color: snippet.color
                })
                .then(function() {
                    self.onNoteSave(snippet, "Note successfully updated.")
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
        createEmptySnippet: function(){
            let snippet = {
                uid: self.model.user.uid,
                id: null,
                parent: '',
                title: '',
                description: '',
                lang: '',
                tags: [],
                color: ''
            };
            return snippet;
        },
        createSnippet: function(){
            // check if already editing new snippet
            let snippet = this.createEmptySnippet();
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
                    if (snippet.lang == this.enums.lang.markdown){
                        
                    }else {
                        this.highlightCode(snippet);
                    }
                });
            }
        },
        // highlight presentation code in viewer
        highlightCode: function(snippet){
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
                if (this.model.codeMirrorRef)
                    this.model.codeMirrorRef.toTextArea(); // prevent submit handler memory leak
                this.model.currentSnippetInEditor = null; // cancel btn
                this.highlightCode(this.model.currentSnippet); // cancel btn
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
                mode: this.getSnippetEditorLang(snippet)
            });
            this.model.codeMirrorRef.getScrollerElement().style.minHeight = '300px';
            this.model.codeMirrorRef.refresh();
        },
        validateSnippet: function(snippet){
            // TODO: validate
            if (!snippet.parent){
                // validate note
                if (snippet.title.length == 0 || snippet.length > this.config.noteTitleMaxLength) return false;
            } else {
                // validate snippet
                if (snippet.title.length == 0 || snippet.length > this.config.snippetTitleMaxLength) return false;
            }
            return true;
        },
        saveSnippet: function(){
            var snippet = this.model.currentSnippetInEditor;
            if (!this.model.codeMirrorRef) console.error('codeMirrorRef not loaded!');
            snippet.content = this.model.codeMirrorRef.doc.getValue(); // get non-highlighted text
            if (!this.validateSnippet(snippet)) return;

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
          console.log('onAuthStateChanged', user)  
          if (user){
              this.model.user = user;
              this.loadNotes(user);
          } else {
              this.model.user = null;
              // reset
              this.model.notes = [];
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
                    items.push(note);
                });
                // build tree
                self.model.notes = this.sortNotes(items);// arrayToTree(items);
            })
            .catch((error) => {
                self.feedbackError(error, "Error getting documents.");
            });
        },
        sortNotes: function(notes){
            return notes.sort((a, b) => a.title.localeCompare(b.title));
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
            let resContainer = this.createEmptySnippet();
            resContainer.id = 'searchTmp';
            resContainer.title = 'Search results';
            let res = [];
            let titles = []; // text found in title
            let contents = []; // text found in content
            for(let i=0,j=this.model.notes.length;i<j;i++){
                if (this.model.notes[i].title && this.model.notes[i].title.toLowerCase().indexOf(text) > -1){
                    let snippet = this.cloneDeep(this.model.notes[i]);
                    snippet.parent = resContainer.id;
                    titles.push(snippet);
                } else if (this.model.notes[i].content && this.model.notes[i].content.toLowerCase().indexOf(text) > -1) {
                    let snippet = this.cloneDeep(this.model.notes[i]);
                    snippet.parent = resContainer.id;
                    contents.push(this.model.notes[i]);
                }
            }
            res.push(...titles);
            res.push(...contents);
            this.selectNotebook(resContainer);
            if (res.length > 0)
                this.model.searchResults = res;
            else
                this.feedbackError(null, 'No results for ' + text);
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
        getNotebookColor: function(note){
            // lavender '#e6e6fa' darkblue #142b40 lightgray #efefef
            if (note.color)
                return note.color;
            return this.state.skin == this.enums.skin.light ? '#efefef': '#142B40';
        }
    },
  }).$mount("#app");


auth.onAuthStateChanged(user => vm.onAuthStateChanged(user));
