/**
 * Unflattens an array to a tree with runtime O(n)
 *
 * This algorithm was taken from Philip Stanislaus's 
 * "Performant Array to Tree" which has O(n) complexity. 
 * It builds the tree in a single pass.
 * @link https://github.com/philipstanislaus
 * @link https://www.npmjs.com/package/performant-array-to-tree
 */
 const arrayToTree = (items) => {
 
    /**
     * The nested tree.
     * @type {*[]}
     */
    const rootItems = [];
 
    // (1) Create a holder for each item.
 
    const lookup = {};
 
    for (const item of items) {
 
        const itemId   = item["id"];
        const parentId = item["parent"];
 
        // (2) Create a placeholder for each item in the lookup. 
        // Details are added later.
 
        if (! lookup[itemId]) lookup[itemId] = { ["children"]: [] }
 
        // (3) Add the details of the item.
 
        lookup[itemId] = { ...item, ["children"]: lookup[itemId]["children"] }
 
        // (4) Create a variable for the current item.
 
        const TreeItem = lookup[itemId];
 
        // (5) Determine where the item goes in the tree. 
 
        // If the item has no parentId, it is the root node.
        if (parentId === null || parentId === undefined || parentId === "") {
 
            rootItems.push(TreeItem);
        }
 
        /*
         * If the item has a parentId, add it to the tree.
         */
 
        else {
 
            // (6) Add a placeholder for parent of the current item.
 
            if (! lookup[parentId]) lookup[parentId] = { ["children"]: [] };
 
            // (7) Add the current item to its parent.
 
            lookup[parentId]["children"].push(TreeItem);
        }
    }
 
    return rootItems
}
