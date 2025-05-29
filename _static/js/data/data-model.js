// => METHOD TO BUILD DATA MODEL FOR NODE AND LINKS
function buildVisDataModel(inputData, reportYear){

    // Init data objects
    const schema = {
        entity:  {}      // Init 'entity' prop as an object
    }
    const meta = {}

    const linkAlternatives = {}  

    /** 
     *   1. SHAPE DATA 
     *   - This could be done at 'master' level: 
     *   - Schema and meta tables only needs to be updated if those tables need updating to accommodate new data use cases
     */

    // Part I. EXTRACT SCHEMA AND META INFO TABLES

    // Reshape and parse data tables
    for(const [tableName, dataTable] of Object.entries(inputData) ){

        // i. For 'schema' tables
        if(tableName.startsWith("schema")){

            const schemaTableName = tableName.slice(7)  // Get name component (slice off 'schema_')
            // a. Init new schema table prop as object
            schema[schemaTableName] = {}

            // b. Reshape original dataTable to be an object, reference-able by "id"
            for(const d of Object.values(dataTable)){
                schema[schemaTableName][d.id] = d
            }
        }

        // ii. For 'meta' info tables
        if(tableName === "meta-link-question-map"){

            const metaTableName = tableName.slice(5)  // Get name component (slice off 'schema_')
            // a. Init new schema table prop as object with separate upstream and downstream 'questions'
            meta[metaTableName] = {
                upstream:   {},
                downstream: {}
            }

            // b. Reshape original dataTable to be an object, reference-able by "id"
            for(const d of Object.values(dataTable)){
                meta[metaTableName][d['link-type']][d.id] = d.question
            }
        }

        // iii. For 'link' data tables
        if(tableName.startsWith("link")){
            // a. Parse any empty 'alternative-entities' entries as an empty array 
            for(const d of dataTable){
                if(d['alternative-entities'] === ""){
                    d['alternative-entities'] = []
                }
            }
        }
    }

    // Part II. SETUP/RE-SHAPE MASTER NODE DATA OBJECT
    for(const obj of inputData['node-master']){     

        // i. Parse fields (where required)
        for(const [key, value] of Object.entries(obj)){
            // i. Parse variations of entries for "isRE_20XX" to boolean or null
            if(key.startsWith("isRE")){
                switch(value){
                    case 'Yes':     
                    case 'YES':     
                    case 'yes':     
                    case 'TRUE':     
                    case 'True':     
                    case 'true':     
                    case true:     
                        obj[key] = true    
                        break
                    case 'No':     
                    case 'NO':     
                    case 'no':     
                    case 'FALSE':     
                    case 'false':     
                    case 'False':     
                    case false:     
                        obj[key] = false    
                        break

                    case '':     
                    case null:     
                        obj[key] = null    
                        break
                } 
            }
        }

        // ii. Add each to 'entity' data prop: This reshaping makes it easier to reference node meta info from the master node table
        schema.entity[obj.id] = obj
    }


    /** 
     *   3. CREATE NODES (ENTITIES) 
     *   - Responsible entity nodes are created from 'node master' table
     *   - Non-Responsible entity nodes are created from the link data. Additional meta info however, comes from 'node master' table  
     *   - All nodes are initialised as a Node class
     *   - ** NEED TO EXTRACT NODES FROM LINK DATA AND TEST => Only nodes in the Link data should be added as a node
     */
    const node = {}
    
    // I. Responsible entity nodes: these are from the 'master node' input data (stored in schema.entity)
    for(const [id, obj] of Object.entries(schema.entity)){
        // Check that id/node is flagged as an RE in the report year
        if(obj[`isRE_${reportYear}`]){
            // Create and add non-Responsible entities to node object 
            node[id] = new Node(obj,  true, schema)
        }
    }

            
    // II. Non-Responsible entity nodes: 
        /// NEED TO ENSURE LINK DATA IS BY REPORTING YEAR
    // a. Extract unique list of node ids from link upstream and downstream data
    const linkDataMerged = inputData['link-upstream'].concat(inputData['link-downstream'])

    const linkDataNodeIds = []
    for(const d of linkDataMerged){
        linkDataNodeIds.push(d['node-from'])
        linkDataNodeIds.push(d['node-to'])
    }

    const nonRespNodeNodeIds = [...new Set(linkDataNodeIds)]                          // Use destructured array of "Set" to return a list of unique ids
                                    .filter( d => !Object.keys(node).includes(d) )      // Filter out responsible entity nodes 
                                    .sort()                                             // Sort alphabetically (not required but helps to order nodes by id when created)

    // b. Create and add non-Responsible entities to node object
    for(const id of nonRespNodeNodeIds){
        // Get meta info from master node list
        const obj = schema.entity[id] ?? { id }     // Note: every node should already 'exist' because it is manually updated. If not, an object with just the id is passed in
        // Add node as an Node class
        node[id] = new Node(obj,  false, schema)
    }
 

    /*
     *   4. CREATE LINKS 
     */
    const link = {}

    let linkIdNo = 0

    // For both tables  of 'link data'
    for(const sourceType of ['upstream', 'downstream']){
        for(const config of inputData[`link-${sourceType}`]){
            // Add link as a Link class
            link[linkIdNo] = new Link(linkIdNo, config, sourceType, node, schema, meta['link-question-map'])

            // Increment link 'id' number to ensure links are added with unique identifiers (i.e. none are overwritten)
            linkIdNo++
        }
    }


    /** 
     *   5. UPDATE NODE INSTANCES WITH SUMMARY OF LINK DATA
     */

    // Update every node (Node) with summary of connect link data
    for(let i = 0; i < 2; i++){     // This needs to be done twice: not entirely sure why though...
        for( const [nodeId, nodeInstance] of Object.entries(node)){
            nodeInstance.summariseLinkData()
        }
    }


    // => Return data in an object
    return { schema , meta, node, link }
}
