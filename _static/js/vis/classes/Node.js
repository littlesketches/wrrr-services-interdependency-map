class Node{

    constructor(config, isResponsibleEntity, schema){    // 'config' is the information from the master node data 
        // Add the id reference (note: this is unlikely to to be used as instances are already referenced by this id)
        this.id = config.id     

        // Copy all meta info across (comes from master node table)
        this.meta = {
            name:           config['entity-name'],
            label:          config.label,
            'label-short':  config['label-short'],
            description:    config['description'],
        }

        // Init a state object for UI
        this.state = {
            config: {   // General node layout and style 
                isResponsibleEntity,
                hasIn:       undefined,
                hasOut:      undefined,
                hasLoop:     undefined,
                returnNodes: [],        // Array of nodes which have return links to this node
                // Services categorisation
                'essential-waste-services':     config['essential-waste-services'],     // Expect a array
                service: {
                    assigned:   undefined,        // Array of assigned services
                    reported:   {}                // Reported 'services' by input/output link data
                }
            },
            node: {
                position: {
                    center: { 
                        x:      undefined,
                        y:      undefined
                    }
                },
                size: {
                    radius: {
                        outer: undefined
                    }
                }
            },
            ui: {
                // user interaction state
                isSelected:     false,
                isFocus:        false,
                isHover:        false,
                isVisible:      true
            }

        }

        // Data 
        this.data = {
            count: {
                essentialWasteServices: config['essential-waste-services'].length,
                services:       undefined,  // Assigned from link data
                link: {   //  All link counts are added when the summariseLinkData methods is called (following all Link instances being created)
                    in:          {},
                    out:         {},       
                    loop:        undefined,      
                    connections: {},

                    // TBA: used for any 'resilience' views
                    alternative:{       // 
                        in:             0,
                        out:            0,
                        connections:    0,
                    }
                }
            }
        }

        if(isResponsibleEntity) this.data['essential-waste-services'] = this.#getEwsData(schema, config)


        // Init the links object to store references to links
        this.link = {
            in:     {},
            out:    {},
            loop:   {},         // additional 
            alternative:{
                in:     {},
                out:    {},
            }
        }
    }


    //////////////////////////
    ////  PRIVATE METHODS  ////
    //////////////////////////

    // Create and object for plotting assigned essential waste services (for REs)
    #getEwsData(schema, config){
        // Init object
        const assignedEws = {}
        
        // Loop through each EWS and check if node is assigned to it
        const ewsData = Object.values(schema['essential-waste-services']),
            assigned = config['essential-waste-services']

        for(const d of ewsData){
            assignedEws[d.id] = {
                isAssigned: assigned.includes(d.id),
                node:       this          // Add reference to node
            }
        }

        // => Return objet
        return assignedEws
    }


    //////////////////////////
    ////  PUBLIC METHODS  ////
    //////////////////////////

    // Add link
    addLink(link, type, isAlternative = false){

        switch(isAlternative){
            // i. For normal links
            case false:
                switch(type){
                    case 'from':
                        this.link.out[link.id] = link
                        break

                    case 'to':
                        this.link.in[link.id] = link
                        break

                    case 'loop': 
                        // Add both the in and out, and record loop
                        this.link.in[link.id] = link
                        this.link.out[link.id] = link
                        this.link.loop[link.id] = link
                        break
                }
                break

            // ii. For any 'alternative' links
            case true:
                switch(type){
                    case 'from':
                        this.link.alternative.out[link.id] = link
                        break

                    case 'to':
                        this.link.alternative.in[link.id] = link
                        break
                }
                break
        }

    }

    // Method to add summary of link information once all links are added
    summariseLinkData(){

        /**
         *  1. SERVICES: Create list of node 'service' implied/assigned by link:  This creates a services list, based on how the link service is reported (by REs) and assigned (by RV)
         */        
        this.state.config.service.assigned = [...new Set(                                                           // Use a destructured set to get a unique list of service id's
                                                Object.values(this.link.in).concat(Object.values(this.link.out))    // from all links "in or out" (i.e. merged array of links)
                                                .map( Link => Link.meta.response['rv-assigned-services'])           // targeting the response in the field 'rv-assigned-services'
                                                .sort()                                                             // (sorted alphabetically)
                                            )]

        this.data.count.services            = this.state.config.service.assigned.length

        /**
         *  2. LINK COUNT: Basic Link count summary
         */ 
        // i. Total link counts
        this.data.count.link.in.degree      = Object.values(this.link.in).length
        this.data.count.link.out.degree     = Object.values(this.link.out).length
        this.data.count.link.loop           = Object.values(this.link.loop).length

        // ii. External link counts (exclude loops)
        this.data.count.link.in.external    = this.data.count.link.in.degree - this.data.count.link.loop
        this.data.count.link.out.external   = this.data.count.link.out.degree - this.data.count.link.loop

        // iii. Summary of links/connections
        this.data.count.link.connections.total      = this.data.count.link.in.degree + this.data.count.link.out.degree 
        this.data.count.link.connections.external   = this.data.count.link.in.external + this.data.count.link.out.external 


        /**
         *  3. LINK META COUNT: Link by "categorisation" counts
         *  - This may be expanded to use more link data 
         */ 

        // i. IN links (i.e. reported in upstream link data) that:
        // - count when node (supplier) is a single point of failure for an entity (an RE) (i.e. count of customers who see this node as a single point of failure)
        this.data.count.link.in.singlePointOfFailure = Object.values(this.link.in)  
                                                .map( Link => Link.meta.response['failure-point-yes-no'])
                                                .filter( d => d === 'yes')
                                                .length

        // - count when node is a "specialised" supplier for an entity (an RE) (i.e. count of customers who consider this a specialised supplier)
        this.data.count.link.in.specialisedSupplier = Object.values(this.link.in)  
                                                .map( Link => Link.meta.response['node-from-specialised-yes-no'])
                                                .filter( d => d === 'yes')
                                                .length

        // ii. OUT links (i.e. reported in downstream data) 
        // - count when upstream nodes (always a REs) that are a single point of failure for this node (i.e. count of single failure points for this node)
        this.data.count.link.out.singlePointOfFailure = Object.values(this.link.out)  
                                                .map( Link => Link.meta.response['failure-point-yes-no'])
                                                .filter( d => d === 'yes')
                                                .length
        /**
         *  4. SET STATE CONFIG FLAGS
         *  - These reference flags are intended assist with styling/layout (i.e. make this info more easily accessible)
         */ 

        // Update link config state 'flags'
        this.state.config.hasIn          = this.data.count.link.in.degree > 0
        this.state.config.hasOut         = this.data.count.link.out.degree > 0
        this.state.config.hasLoop        = this.data.count.link.loop  > 0                           // aka is vertically integrated

        this.state.config.isSource       = this.state.config.hasOut && !this.state.config.hasIn     // 
        this.state.config.isSink         = this.state.config.hasIn && !this.state.config.hasOut
        this.state.config.isIntermediate = (this.data.count.link.in.degree - this.data.count.link.loop) > 0 && (this.data.count.link.out.degree - this.data.count.link.loop) > 0

        this.state.config.singleFailurePoint = {
            in:    Object.values(this.link.in).filter( Link => Link.meta.response['failure-point-yes-no'] === 'yes'),
            out:   Object.values(this.link.out).filter( Link => Link.meta.response['failure-point-yes-no'] === 'yes')
        }

        this.state.config.resilient = {
            in:    Object.values(this.link.in).filter( Link => Link.meta.response['failure-resilience-yes-no'] === 'yes'),
            out:   Object.values(this.link.out).filter( Link => Link.meta.response['failure-resilience-yes-no'] === 'yes')
        }

        this.state.config.specialised = {
            out:   Object.values(this.link.out).filter( Link => Link.meta.response['node-from-specialised-yes-no'] === 'yes')
        }


        // For intermediate nodes
        if(this.state.config.isIntermediate ){
            // Test if node is connected to any other intermediate nodes with external (non-loop) links
            const outLinks = Object.values(this.link.out).filter( Link => Link.node.to.state.config.isIntermediate && (Link.node.to !== Link.node.from)),   // Connected from as a source fto another intermediate node (excluding loops)
                inLinks    = Object.values(this.link.in).filter( Link => Link.node.from.state.config.isIntermediate && (Link.node.to !== Link.node.from))  // Connected to as a sink from another intermediate node (excluding loops)                                    

            this.state.config.intermediate = {
                isSource:          outLinks.length > 0 && inLinks.length === 0,         // Source: has out links but no in links (to intermediates)
                isSink:            inLinks.length > 0  && outLinks.length === 0,         // Sink: has in links but no out links  (to intermediates)
                isIntermediate:    outLinks.length > 0 && inLinks.length > 0,           
                isUnconnected:     inLinks.length === 0 && outLinks.length === 0, 
            }
        }


        /**
         * 5.ADD NETROWK TRACE
         */
        this.data.network = this.networkTrace()



    }

    // Method to trace upstream and downstream from this node to the edge of network and record all connected nodes and
    networkTrace(){

        /**
         *  LEVEL 0 and 1: Init trace by levels with this node
         */
        const tree = {
            0: {
                node: this
            },
            1: {
                link: {},
                node: {}
            }
        }

        // Add nodes
        const upstreamLinks = Object.values(this.link?.in),
            upstreamNodes   = upstreamLinks.map(link => link.node.from),
            downstreamLinks = Object.values(this.link?.out),
            downstreamNodes = downstreamLinks?.map(link => link.node.to)

        if(upstreamLinks.length)   tree[1].link.upstream = upstreamLinks
        if(upstreamNodes.length)   tree[1].node.upstream = upstreamNodes
        if(downstreamLinks.length) tree[1].link.downstream = downstreamLinks
        if(downstreamNodes.length) tree[1].node.downstream = downstreamNodes

        /**
         *  Track all nodes and links to avoid re-trace
         */ 
        let trackedNodes = [...new Set([this].concat(upstreamNodes ?? []).concat(downstreamNodes ?? []))],
            trackedLinks = [this].concat(upstreamLinks ?? []).concat(downstreamLinks ?? []),
            trackedUpstreamNodes =  [...new Set(upstreamNodes)],       // Looking for any 'upstream' nodes that reappear in the downstream trace (i.e. loop behaviour)
            trackedDownstreamNodes = [...new Set(downstreamNodes)],   // Looking for any 'downstream' nodes that appear in the upstream trace (i.e. loop behaviour)
            repeatNodes = [],
            repeatLinks = []

    if(this.id === 'swift-blue-tongue-skink'){
        // console.log(trackedDownstreamNodes.filter(d => d.state.config.isIntermediate))
    }

        /**
         *  LEVEL 2+: Trace in levels until the end of network (up and down)
         */

        // a. Init depth counter and trace depth counter
        const depth = {
            upstream: 1,
            downstream: 1
        }

        // b. Build tree with recursive function
        let traceDepth = 1      // Counter for next trace depth 

        trace(tree, this)            

        // => Return the tree data 
        return {tree, depth}


        // Recursive trace algorithm
        function trace(tree, node){

            // 1. Check if there are upstream or downstream links on the prior depth level
            const prevUpstreamNodes = tree[traceDepth].node?.upstream,
                prevDownstreamNodes = tree[traceDepth].node?.downstream

            const upstreamLinks = prevUpstreamNodes ? Object.values(prevUpstreamNodes).map(node => Object.values(node.link.in)).flat() : [],
                upstreamNodes   = [...new Set(upstreamLinks?.map(link => link.node.from).filter( node => !trackedUpstreamNodes.includes(node)) )], // Filter upstream nodes already tracked,
                downstreamLinks = prevDownstreamNodes ? Object.values(prevDownstreamNodes).map(node => Object.values(node.link.out)).flat() : [],
                downstreamNodes = [...new Set (downstreamLinks?.map(link => link.node.to).filter( node => !trackedDownstreamNodes.includes(node)) )], // Filter upstream nodes already tracked

                upstreamCollisionNodes = [...new Set(upstreamLinks?.map(link => link.node.from))].filter( node => trackedNodes.includes(node)),
                downstreamCollisionNodes =[...new Set (downstreamLinks?.map(link => link.node.to))].filter( node => trackedNodes.includes(node)) // Filter upstream nodes already tracked

            // 2. Update tracked nodes: note both upstream and downstream are updated, even if one may empty/finished 
            trackedNodes            = [...trackedNodes, ...upstreamNodes, ...downstreamNodes]
            trackedUpstreamNodes    = [...new Set([...trackedUpstreamNodes, ...upstreamNodes])]
            trackedDownstreamNodes  = [...new Set([...trackedDownstreamNodes, ...downstreamNodes])]

            // 3. Calculate next trace level
            traceDepth++            // increment traceDepth

            // i. Init next depth prop
            tree[traceDepth] = {
                link: {},          
                node: {}         
            } 

            // ii. Add upstream links and nodes, if required
            if(upstreamLinks?.length > 0){
                tree[traceDepth].link.upstream = upstreamLinks
                tree[traceDepth].node.upstream = upstreamNodes

                depth.upstream = traceDepth     // Update trace depth
            } 
            // iii. Add downstream links and nodes, if required
            if(downstreamLinks?.length > 0) {
                tree[traceDepth].link.downstream = downstreamLinks
                tree[traceDepth].node.downstream = downstreamNodes

                depth.downstream = traceDepth // Update trace depth
            }

            // => Return if there are no more upstream and no downstream nodes to trace
            if(upstreamNodes.length === 0 && downstreamNodes.length === 0) return   

            // 4. Recursively call trace
            trace(tree, node)    
        }
    }

    highlight(){
        console.log("Highlight this node")
    }

    // UI
    highlightLinks(){
        const inputLinks     = this.links.in
        const outputLinks    = this.links.out
        const loopLinks      = this.links.loop

        let inputNodes = []

        for(const [id, link] of Object.entries(inputLinks)){
            // Call method to highlight input links
        }

        for(const [id, link] of Object.entries(outputLinks)){
            // Call method to highlight output links
        }

        for(const [id, link] of Object.entries(loopLinks)){
            // Call method to highlight loop links
        }


        return 
    }
}