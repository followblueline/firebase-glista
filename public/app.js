// tutorial: firebase basics
// https://www.youtube.com/watch?v=q5J5ho7YUhA&ab_channel=Fireship
const db = firebase.firestore();
let dbNotesRef = db.collection('notes');
// User Authentication
const auth = firebase.auth();
const googleAuthProvider = new firebase.auth.GoogleAuthProvider();
Vue.use(hljs.vuePlugin);

let self;
var vm = new Vue({
    // components:{
    //   'movie-list': cMovieList
    // },
    created: function(){
      self = this; // preserve this scope for async functions
      console.log("vue created");
      self.adjustViewerFontSize();
    },
    data: {
      model: {
          user: null,
          notes: [], // all notes
          currentNote: null,
          currentSnippet: null,
          currentSnippetInEditor: null, // for edit mode, leave original intact in case of cancellation
          codeMirrorRef: null, // reference for code mirror, we need it to retrieve non-highlighted editor content before saving
          notesUsubscribe: null,
      },
      state:{
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
            this.model.currentNote = note;
        },
        createSnippet: function(){
            // check if already editing new snippet
            var snippet = {
                uid: self.model.user.uid,
                id: null,
                parent: self.model.currentNote.id,
                title: '',
                description: '',
                tags: []
            };
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
                    this.highlightCode(snippet);
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
                this.model.currentSnippetInEditor = _.cloneDeep(snippet); // edit
                //vm.$forceUpdate();
                //vm.$nextTick().then(() => {
                //this.loadCodeEditor(snippet);
                //});
                setTimeout(() => {
                    self.loadCodeEditor(snippet);
                }, 100);
            }
        },
        cloneSnippet: function(){
            if (this.editingSnippet){
                this.model.currentSnippetInEditor = _.cloneDeep(this.model.currentSnippetInEditor);
                this.model.currentSnippetInEditor.id = null;
                this.model.currentSnippetInEditor.title +=" clone"; 
            } else if(this.model.currentSnippet) {
                this.model.currentSnippetInEditor = _.cloneDeep(this.model.currentSnippet);
                this.model.currentSnippetInEditor.id = null;
                this.editSnippet(this.model.currentSnippetInEditor);
            }
        },
        // highlight code in editor
        loadCodeEditor: function(snippet){
            // codemirror init https://codemirror.net/doc/manual.html
            this.model.codeMirrorRef = CodeMirror.fromTextArea(document.getElementById("formContent"), {
                lineNumbers: true,
                tabSize: 4,
                indentUnit: 4,
                mode: 'javascript'
            });
            this.model.codeMirrorRef.getScrollerElement().style.minHeight = '300px';
            this.model.codeMirrorRef.refresh();
        },
        validateSnippet: function(snippet){
            // real validation goes here
            if (snippet.title.length == 0) return false;
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
                    snippet.id = docRef.id;
                    self.onSnippetSave(null, snippet, "Document successfully added")
                })
                .catch(function(error) {
                    self.onSnippetSave(error, snippet, "Error adding document");
                });
            } else {
                // update
                var docRef = dbNotesRef.doc(snippet.id);
                // update = update, set = insert. set will overwrite whole object if exists
                docRef.update({
                    title: snippet.title,
                    description: snippet.description || '',
                    content: snippet.content || ''
                })
                .then(function() {
                    self.onSnippetSave(null, snippet, "Document successfully updated!")
                })
                .catch((error) => {
                    self.onSnippetSave(error, snippet, "Error updating document");
                });
            }
        },
        onSnippetSave: function(error, snippet, msg){
            if (error){
                console.error(msg || 'Error', error);
            } else {
                console.log(msg);
                // refresh edited item in list with edited values
                // should be loaded from db
                let created = this.model.currentSnippet.id == null || snippet.id != this.model.currentSnippet.id; // created or cloned
                if (!created){
                    // existing snippet
                    _.merge(this.model.currentSnippet, snippet);
                } else {
                    // if snippet was created, append it to snippets list
                    self.model.notes.unshift(snippet); // insert snippet to other notes snippets at the beginning of the array
                    this.selectSnippet(snippet);// select clone
                }
                this.sortNotes(self.model.notes); // reorder
                this.editSnippet(null);
                this.highlightCode(snippet);
            }
        },
        deleteSnippet: function(snippet){
            // Warning: Deleting a document does not delete its subcollections!
            if (confirm(`Delete ${snippet.title}?`)){
                dbNotesRef.doc(snippet.id)
                .delete()
                .then(() => {
                    console.log("Document successfully deleted!");
                    // osvjezi UI
                    var itemIndex = self.model.notes.findIndex(x => x.id == snippet.id);
                    self.model.notes.splice(itemIndex,1);
                    self.selectSnippet(null);
                    // doesnt refresh vue UI
                    //_.remove(self.model.notes, function(x) { return x.id == snippet.id});
                    //self.$forceUpdate();
                }).catch((error) => {
                    console.error("Error removing document: ", error);
                });
            }
        },
        onAuthStateChanged: function(user){
          console.log('onAuthStateChanged', user)  
          if (user){
              this.model.user = user;
              this.loadNotes(user);
          } else {
              this.model.user = null;
          }
        },
        loadNotes: function(user){
            let self = this;
            console.log('loadNotes');
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
                console.log("Error getting documents: ", error);
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
            if (!sizeAdjustment && localStorage.getItem('viewerFontSize') != null){
                newSize = parseInt(localStorage.getItem('viewerFontSize'));
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
                //viewer.style.fontSize = (newSize) + 'px';
                localStorage.setItem('viewerFontSize', newSize); // remember
            }
        },
        // shorten text
        truncateText: function (str, n){
            return (str.length > n) ? str.substr(0, n-1) + '...' : str;
        }
    },
  }).$mount("#app");


auth.onAuthStateChanged(user => vm.onAuthStateChanged(user));
