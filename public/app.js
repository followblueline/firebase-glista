// tutorial: firebase basics
// https://www.youtube.com/watch?v=q5J5ho7YUhA&ab_channel=Fireship

const db = firebase.firestore();

let dbNotesRef = db.collection('notes');
//let unsubscribe;


// User Authentication
const auth = firebase.auth();

const whenSignedIn = document.getElementById('whenSignedIn');
const whenSignedOut = document.getElementById('whenSignedOut');

// const signInBtn = document.getElementById('signInBtn');
// const signOutBtn = document.getElementById('signOutBtn');

const userDetails = document.getElementById('userDetails');


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
          currentSnippetInEditor: null, // for edit mode, leave original intact in case cancelling edit
          notesUsubscribe: null,
      },
      state:{
        editingSnippet: false
      }
    },
    computed:{
    },
    methods:{
        selectNotebook: function(note){
            this.model.currentNote = note;
        },
        selectSnippet: function(snippet){
            this.model.currentSnippet = snippet;
        },
        editSnippet: function(snippet){
            if (!snippet){
                // cancel
                this.state.editingSnippet = false;
                this.model.currentSnippetInEditor = null;
            } else {
                // edit
                this.state.editingSnippet = true;
                this.model.currentSnippetInEditor = _.cloneDeep(snippet);
            }
        },
        saveSnippet: function(){
            console.log('save', this.model.currentSnippetInEditor.content);
            this.model.currentSnippet = _.cloneDeep(this.model.currentSnippetInEditor);
            
            var docRef = dbNotesRef.doc(this.model.currentSnippet.id);
            // update = update, set = insert. set will overwrite whole object if exists
            docRef.update({
                content: this.model.currentSnippet.content
            })
            .then(function() {
                console.log("Document successfully updated!");
                self.editSnippet(null);
            })
            .catch((error) => {
                console.error("Error updating document: ", error);
            });
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



///// Firestore /////
// const db = firebase.firestore();
// const createThing = document.getElementById('createThing');
// const thingsList = document.getElementById('thingsList');

// let collNotes;
// let unsubscribe;

auth.onAuthStateChanged(user => vm.onAuthStateChanged(user));
/*
auth.onAuthStateChanged(user => {

    if (user) {

        // Database Reference
        collNotes = db.collection('notes')

        // createThing.onclick = () => {
        //     const { serverTimestamp } = firebase.firestore.FieldValue;
        //     thingsRef.add({
        //         uid: user.uid,
        //         name: faker.commerce.productName(),
        //         datecreated: serverTimestamp()
        //     });
        // }

        // Query
        unsubscribe = collNotes
            .where('uid', '==', user.uid)
            .where('parent', '==', null )
            .orderBy('datecreated') // Requires a query
            .onSnapshot(querySnapshot => {
                
                // Map results to an array of li elements

                const items = querySnapshot.docs.map(doc => {
                    return `<li>${doc.data().title}</li>`
                });
                thingsList.innerHTML = items.join('');
            });
    } else {
        // Unsubscribe when the user signs out
        unsubscribe && unsubscribe();
    }
});*/
