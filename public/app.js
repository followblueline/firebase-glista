// tutorial: firebase basics
// https://www.youtube.com/watch?v=q5J5ho7YUhA&ab_channel=Fireship
const db = firebase.firestore();
let dbNotesRef = db.collection('notes');
// User Authentication
const auth = firebase.auth();
const googleAuthProvider = new firebase.auth.GoogleAuthProvider();
let self;

var vm = new Vue({
    // components:{
    //   'movie-list': cMovieList
    // },
    created: function(){
      self = this; // preserve this scope for async functions
      console.log("vue created");
    },
    data: {
      model: {
          user: null,
          notes: [],
          currentNote: null,
          currentSnippet: null,
          currentSnippetInEditor: null, // for edit mode, leave original intact in case of cancellation
          notesUsubscribe: null,
      },
      state:{
      }
    },
    computed:{
        editingSnippet: function(){
            return this.model.currentSnippetInEditor != null;
        }
    },
    methods:{
        selectNotebook: function(note){
            this.model.currentNote = note;
        },
        createSnippet: function(){
            // check if already editing new snippet
            if (self.model.currentNote?.children?.[0]?.id == 0) return;

            var snippet = {
                uid: self.model.user.uid,
                id: null,
                children: [],
                parent: self.model.currentNote.id,
                title: 'New snippet',
                description: '',
                tags: []
            };
            self.model.currentNote.children.unshift(snippet); // insert snippet to other notes snippets at the beginning of the array
            self.selectSnippet(snippet); // select new snippet
            self.editSnippet(snippet);// immediately open in editor
        },
        selectSnippet: function(snippet){
            this.model.currentSnippet = snippet;
        },
        editSnippet: function(snippet){
            if (!snippet){
                this.model.currentSnippetInEditor = null; // cancel
            } else {
                this.model.currentSnippetInEditor = _.cloneDeep(snippet); // edit
            }
        },
        validateSnippet: function(snippet){
            // real validation goes here
            if (snippet.title.length == 0) return false;
            return true;
        },
        saveSnippet: function(){
            var snippet = this.model.currentSnippetInEditor;
            if (!this.validateSnippet(snippet)) return;

            // remove our metadata
            delete snippet.children;
            if (!snippet.id){
                // insert. set will overwrite whole object if exists
                dbNotesRef.add(
                    snippet
                )
                .then(function(docRef) {
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
                // should be loaded from db but then we have to recalculate children metadata
                _.merge(this.model.currentSnippet, snippet);
                this.editSnippet(null);
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
                self.model.notes = arrayToTree(items);
            })
            .catch((error) => {
                console.log("Error getting documents: ", error);
            });
        },
        onSignOut: function(){
            auth.signOut();
        },
        onGoogleSignIn: function(){
            auth.signInWithPopup(googleAuthProvider);
        }
    },
  }).$mount("#app");


auth.onAuthStateChanged(user => vm.onAuthStateChanged(user));
