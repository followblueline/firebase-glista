# firebase-glista
notebank for firebase

Dependencies
- highlight.js for syntax highlighting
- codemirror text editor
- showdown text to HTML converter https://github.com/showdownjs/showdown
- toast notification https://www.npmjs.com/package/vue-toast-notification
- icons https://fontello.com/
    - modify current icon selection: upload /css/css_fontello/config.json to Import (Wrench icon)


- available languages 
    - modes https://codemirror.net/mode/ for more https://www.jsdelivr.com/package/npm/codemirror?path=mode
- current lang viewer-editor mapping:
    highlight js | codemirror
    Autodetect      -
    plaintext       -
    markdown        
    csharp          clike
    javascript  
    sql         
    json            -
    python      
    css         

# Installation

- Firestore rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
    
    match /notes/{docId}{
    	allow write: if request.auth.uid == request.resource.data.uid;
      allow delete: if request.auth.uid == request.resource.data.uid;
    	allow read: if request.auth.uid == resource.data.uid;
    }
    
    match /notes/{parent}{
      allow delete: if request.auth.uid == resource.data.uid;
    }
  }
}
```

- Firestore indexes:

Collection ID	Fields indexed	Query scope		Status	
notes	uid Ascending datecreated Ascending	Collection		Enabled	
notes	parent Ascending uid Ascending datecreated Ascending	Collection		Enabled	
