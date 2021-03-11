///// User Authentication /////

const auth = firebase.auth();

const whenSignedIn = document.getElementById('whenSignedIn');
const whenSignedOut = document.getElementById('whenSignedOut');

// const signInBtn = document.getElementById('signInBtn');
// const signOutBtn = document.getElementById('signOutBtn');

const userDetails = document.getElementById('userDetails');


const provider = new firebase.auth.GoogleAuthProvider();


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
          notes: []
      }
    },
    computed:{
    },
    methods:{
        onUserLogIn: function(user){
            console.log('onUserLogIn', user);
            this.model.user = user;
        },
        onUserLogOut: function(user){
            console.log('onUserLogOut', user);
            this.model.user = null;
        }
    },
  }).$mount("#app");

/// Sign in event handlers

signInBtn.onclick = () => auth.signInWithPopup(provider);

signOutBtn.onclick = () => auth.signOut();

auth.onAuthStateChanged(user => {
    if (user) {
        vm.onUserLogIn(user);
        // signed in
        whenSignedIn.hidden = false;
        whenSignedOut.hidden = true;
        userDetails.innerHTML = `<h3>Hello ${user.displayName}!</h3> <p>User ID: ${user.uid}</p>`;
    } else {
        vm.onUserLogOut(user);
        // not signed in
        whenSignedIn.hidden = true;
        whenSignedOut.hidden = false;
        userDetails.innerHTML = '';
    }
});



///// Firestore /////

const db = firebase.firestore();

const createThing = document.getElementById('createThing');
const thingsList = document.getElementById('thingsList');


let thingsRef;
let unsubscribe;

auth.onAuthStateChanged(user => {

    if (user) {

        // Database Reference
        thingsRef = db.collection('notes')

        // createThing.onclick = () => {

        //     const { serverTimestamp } = firebase.firestore.FieldValue;

        //     thingsRef.add({
        //         uid: user.uid,
        //         name: faker.commerce.productName(),
        //         datecreated: serverTimestamp()
        //     });
        // }


        // Query
        unsubscribe = thingsRef
            .where('uid', '==', user.uid)
            .where('parent', '==', null)
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
});