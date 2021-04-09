var appSettings = (function(){
  
    var config = {
      debug: true,
      validation: {
        noteTitleMaxLength: 30,
        snippetTitleMaxLength: 100,
        descriptionMaxLength: 4000,
        contentMaxLength: 100000
      },
      noteColors:[
          // https://www.w3schools.com/colors/colors_names.asp
          {name: 'Maroon', code: '#800000'},
          {name: 'Brown', code: '#9a6324'},
          {name: 'Red', code: '#e6194b'},
          {name: 'Fire brick', code: '#b22222'},
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
    };
    
    var enums = {
      noteType: {
        note: 'note',
        snippet: 'snippet'
      },
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
    }

    var data = {
      
    };
  
    return {
      config: config,
      enums: enums,
      data: data
    }
  })();
  
  