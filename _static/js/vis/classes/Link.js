class Link{

    constructor(linkId, config, sourceType, node, schema, linkQuestionMeta){    // 'config' is the information from the master node data 
        this.id = linkId

        this.config = {
            nodeType:   {},
            frequency:          config.frequency,       
            singleFailurePoint: config['failure-point-yes-no'],             // Supplier or customer identified as a single point of failure (note: customer possible but none identified in 2024 data)
            failureResilient:   config['failure-resilience-yes-no'],        // Could supplier or customer operate if RE failed (use with meta.reportedAs)
            fromSpecial:        config['node-from-specialised-yes-no']      // Supplier identified as specialised by customer (always RE), i.e. 'specialised supplier'
        }

        // Init node prop with references to connected 'from' and 'to'
        this.node = {
            from:      node[config['node-from']],
            to:        node[config['node-to']],
        }

        // Init meta prop
        this.meta = {
            reportedAs:     sourceType,                     // Store the type of data from which the link data came from (i.e. 'upstream' or 'downstream' link data)
            question:       linkQuestionMeta[sourceType],    // Store question map relevant to sourceType (as these can differ between 'upstream' or 'downstream)
            response:       {}                              // Store the response data 
        }

        // Store the link 'response' data (i.e. data from link upstream or downstream)
        for(const [key, value] of Object.entries(config)){
            switch(key){
                // case 'frequency': 

                //     break
                default:
                    this.meta.response[key] = value
            }
        }

        // Init a state object for UI
        this.state = {
            path:   undefined,      // SVG PATH defined once all nodes are positioned
            ui: {
                // user interaction state
                isSelected:     false,
                isFocus:        false,
                isHover:        false,
                isVisible:      true
            }
        }

        // Data 
        this.data = {}

        // Update linked nodes
        this.updateLinkedNodes()
        this.updateLinkConfig()
    }


    //////////////////////////
    ////  PRIVATE METHODS  ////
    //////////////////////////

    updateLinkConfig(){

        const fromNode = this.node.from,
            toNode = this.node.to

        // Check if link is a loop
        this.config.isLoop = fromNode === toNode

        // Set to/from node types
        if(fromNode.state.config.isSource)        this.config.nodeType.from = 'source'
        if(fromNode.state.config.isIntermediate)  this.config.nodeType.from = 'intermediate'
        if(toNode.state.config.isSink)            this.config.nodeType.to   = 'sink'
        if(toNode.state.config.isIntermediate)    this.config.nodeType.to   = 'intermediate'

        // For intermediate
        if(this.config.nodeType.from === 'intermediate' || this.config.nodeType.to  === 'intermediate'){
            this.config.nodeType.intermediate = {}
        
            if(config.nodeType.from === 'intermediate'){
                if(fromNode.state.config.intermediate.isSink)         this.config.nodeType.intermediate.from ='sink'
                if(fromNode.state.config.intermediate.isSource)       this.config.nodeType.intermediate.from ='source'
                if(fromNode.state.config.intermediate.isIntermediate) this.config.nodeType.intermediate.from ='intermediate'
                if(fromNode.state.config.intermediate.isUnconnected)  this.config.nodeType.intermediate.from ='unconnected'
            }

            if(config.nodeType.to  === 'intermediate'){
                if(toNode.state.config.intermediate.isSink)         this.config.nodeType.intermediate.to ='sink'
                if(toNode.state.config.intermediate.isSource)       this.config.nodeType.intermediate.to ='source'
                if(toNode.state.config.intermediate.isIntermediate) this.config.nodeType.intermediate.to ='intermediate'
                if(toNode.state.config.intermediate.isUnconnected)  this.config.nodeType.intermediate.to ='unconnected'
            }
        }
    }


    //////////////////////////
    ////  PUBLIC METHODS  ////
    //////////////////////////

    updateLinkedNodes(){
        const fromNode = this.node.from,
            toNode = this.node.to

        // 1. Check for an  internal 'loop'  
        if(fromNode.id === toNode.id){
            fromNode.addLink(this, 'loop')        
        } else { // Add link data to different from and to nodes
            fromNode.addLink(this, 'from')
            toNode.addLink(this, 'to')
        }

        // 2. Check for a node-to-node loop
        const hasReturn = Object.values(toNode.link.out)
                        .map( link => link.node.to)
                        .includes(fromNode)

        if(hasReturn & fromNode.id !== toNode.id){
            // a. Update state of this link
            this.config.isReturn = true

            // b. Find return link(s) and update their state
            const returnLinks = Object.values(toNode.link.out).filter(link => link.node.to === fromNode) 
            returnLinks.forEach(link => link.config.isReturn = true)

            // c. Update state of nodes 
            toNode.state.config.returnNodes.push(fromNode)
            fromNode.state.config.returnNodes.push(toNode)
        }
    }

    highlightNodes(){
        // Reference nodes
        const from = this.node.from
        const to    = this.node.to
        
        // Highlight the nodes


        // = Return nodes        
        return {from, to}
    }
}