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
                title: '',
                description: '',
                tags: []
            };
            self.model.currentNote.children.unshift(snippet); // insert snippet to other notes snippets at the beginning of the array
            self.selectSnippet(snippet); // select new snippet
            self.editSnippet(snippet);// immediately open in editor
        },
        selectSnippet: function(snippet){
            this.model.currentSnippet = null;
            this.$nextTick().then(() => {
                // highlighter replaces pre > code element and vue is not registering change
                // destroy dom element in if with null
                // and rerender again
                this.model.currentSnippet = snippet;
                setTimeout(() => {
                hljs.highlightAll();
                }, 100);
              });
            // document.querySelectorAll('#snippet .content pre code').forEach((block) => {
            //     console.log(block);
            //     hljs.highlightBlock(block);
            // });
            // hljs.highlightAll();
            // self.$forceUpdate();
        },
        // highlightSnippet: function(content){
        //     hljs.highlightBlock(content);
        // },
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
                // should be loaded from db but then we have to recalculate children metadata
                _.merge(this.model.currentSnippet, snippet);
                this.editSnippet(null);
            }
        },
        deleteSnippet: function(snippet){
            // Warning: Deleting a document does not delete its subcollections!
            // TODO: if adding more sublevels, delete all children
            if (confirm(`Delete ${snippet.title}?`)){
                dbNotesRef.doc(snippet.id)
                .delete()
                .then(() => {
                    console.log("Document successfully deleted!");
                    // osvjezi UI
                    _.remove(self.model.currentNote.children, function(x) { return x.id == snippet.id});
                    self.$forceUpdate();
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
        },
        onEmailPassSignIn: function(){
            let email = 'vrtnipanj@gmail.com';
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
        }
    },
  }).$mount("#app");


auth.onAuthStateChanged(user => vm.onAuthStateChanged(user));
