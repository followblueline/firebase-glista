// tutorial: firebase basics
// https://www.youtube.com/watch?v=q5J5ho7YUhA&ab_channel=Fireship

// User Authentication
const auth = firebase.auth();

const whenSignedIn = document.getElementById('whenSignedIn');
const whenSignedOut = document.getElementById('whenSignedOut');

// const signInBtn = document.getElementById('signInBtn');
// const signOutBtn = document.getElementById('signOutBtn');

const userDetails = document.getElementById('userDetails');


const googleAuthProvider = new firebase.auth.GoogleAuthProvider();


var vm = new Vue({
    // components:{
    //   'movie-list': cMovieList
    // },
    created: function(){
      var self = this; // preserve this scope for async functions
      console.log("vue created");
    },
    data: {
      model: {
          user: null,
          notes: [],
          currentNote: null,
          currentSnippet: null,
          notesUsubscribe: null
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
            collNotes = db.collection('notes')
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
const db = firebase.firestore();
const createThing = document.getElementById('createThing');
const thingsList = document.getElementById('thingsList');

let collNotes;
let unsubscribe;

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
