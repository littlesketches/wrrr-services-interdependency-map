/**
 *  CLASS FOR VISUALISATION LAYOUT
 */

//  => Layout Class
class Layout{

    /////////////////////////
    /// PRIVATE VARIABLES ///
    /////////////////////////

    // Chart config
    config = {
        // I. Visualisation options
        option:  {
            direction:  'vertical',         // Currently unused: would be for a horizontal version
            link:{
                network:    'tapered'       // Style of network links 'tapered' or 'path'
            } 
        },

        // II. SVG dimensions
        dims:  {
            width:      1100,       
            height:     1100,
            margin: {
                top:        50,
                bottom:     50,
                left:       50,
                right:      50,         
            },
            chart: { /* Added in constructor based on specified margins: expected to result in a square (1:1 aspect ratio) chart */},
            
            // Node "sizing" details
            node: {
                source:{
                    padding:    1,      // As a proportion of node size
                    majorRatio: 4       // Ratio of nodesize on major axis (i.e. height multiple of width for a vertical major axis)
                },
                sink:{
                    padding:    1,      // As a proportion of node size
                    majorRatio: 4       // Ratio of nodesize on major axis (i.e. height multiple of width for a vertical major axis)

                },
                intermediate:{
                    padding:    1,      // As a proportion of calculated node size,
                    scale: {
                        min:    0.15,           // Radius as a proportion of node width,
                        max:    0.75,           // Radius as a proportion of node width,
                    }
                }, 
                detail: {
                    loop: {
                        innerRadius:    0.5,       // 
                        outerRadius:    1,          //
                    },
                    ewsSize:    1.5          // Scale factor for size of essential waste service 'petal': multiple of the node radius
                }
            }, 

            //  Node cluster "position":  along the major axis, as a proportion of chart major axis length
            nodeCluster: { 
                source:             0.0,      
                intermediate: {
                    source:         0.25,               // Set to source stem end
                    intermediate: {                     // Can be 'off center' to give more room for source links 
                        start:      0.3,                // Should be > source
                        end:        0.8,                // Should be < sink
                    },  
                    unconnected:    (0.8 + 0.3) * 0.5,  // Align to center of intermediate
                    sink:           0.85                // Set to sink stem start
                },
                sink:               1
            },

            // Link details
            link: {
                // Return link config
                returnLink: {
                    arcRadius:      0.5,          // Arc radius factor for return links
                },
                // Internal node loops (i.e. vertical integration)
                loop: {
                    // TBA if required
                },
                // Source or supplier connected 'bezier with stem' style link coordinate details
                source: {           // From source nodes to intermediate
                    stemStart:      0.075,       // Offset from the edge (should be equivalent of max node length)
                    stemEnd:        0.25,       // Align to position of nodeCluster.intermediate.source nodes: 'straightening point' for input to all intermediate nodes
                },
                intermediate: {     // From intermediate to sink: these are expected to be identical but are split out for optional fine grained control
                    source: {
                        stemStart:  0.85,        // Align to nodeCluster.intermediate.sink
                        stemEnd:    0.95,       // 'straightening point' for intermediate nodes to sink nodes
                    },
                    sink: {
                        stemStart:  0.85,        // Align to nodeCluster.intermediate.sink
                        stemEnd:    0.95,       // 'straightening point' for intermediate nodes to sink nodes
                    },
                    intermediate: {
                        stemStart:  0.85,        // Align to nodeCluster.intermediate.sink
                        stemEnd:    0.95,       // 'straightening point' for intermediate nodes to sink nodes
                    },
                    unconnected: {
                        stemStart:  0.85,        // Align to nodeCluster.intermediate.sink
                        stemEnd:    0.95,       // 'straightening point' for intermediate nodes to sink nodes
                    },
                    repeatedLinkWeightFactor: 4
                },
                // Intermediate network links
                network: {
                    // TBA if required
                }
            }
        }   
    }

    // Node and  property: initialised  
    node = {}

    link = {}
    // Scale prop
    scale = {}


    //////////////////////////
    /// CONSTRUCTOR METHOD ///
    //////////////////////////

    constructor(node, link, schema){
        // Store input data
        this._data  = { node, link, schema}

        // Add implied chart dims
        this.config.dims.chart = this.#getChartDims()

        // Calculate node layout clusters
        this.node.cluster = this.#calculateNodeClusters(node, schema)   // Includes sort of intermediate
        this.node.layout  = this.#calculateNodeLayout()

        this.link.relationships =  this.#calculateLinkRelationships()
        
        // Add scales for nodes and links
        this.scale = this.#calculateScales(node)

        // Sort intermediate nodes and update positions
        const sortedIntermediateNodes = this.#sortIntermediateNodes(this.node.cluster.intermediateNodes)    
        this.#updateNodePositions(sortedIntermediateNodes)    

        // Sort source and sink node and update positions
        const sortedSourceAndSinkNodes = this.#sortSourceAndSinkNodes()                
        this.#updateNodePositions(sortedSourceAndSinkNodes)     

        // update all link geometry
        this.#updateLinkPaths(link)

        // Add render 'summary' node and link data (references for rendering)
        this.render = this.#assembleRenderData()

        // Debug
        console.log(this)
    }


    ////////////////////////
    /// PRIVATE METHODS  ///
    ////////////////////////

    // Return dimensions for the "chart" area: this is inset by specified margins on all sides
    #getChartDims(){
        return {
            width:  this.config.dims.width  - this.config.dims.margin.left - this.config.dims.margin.right,
            height: this.config.dims.height - this.config.dims.margin.top  - this.config.dims.margin.bottom,
        }
    }

    // Group key nodes clusters used in layout 
    #calculateNodeClusters(node, schema){

        /**
         *  I. GET "POSITIONING" DATA
         *  ==> TO REWRITE NOTES ONCE COMPLETE - these are early ideas for trial (not all implemented)
         *   Filtering/grouping  by:
         *  - Level 1:  "category"  is done as the highest layer of positional flow grouping  (i.e. sources > intermediates > sinks )
                - "responsible entity" is subset of "intermediate" that may be suitable for centring
         *  - Level 2a: "essential waste service" and (potentially) "service" are used for clustering and ordering/positioning of those clusters (e.g. centering by most common to reduce link crossover; or by 'similarity' or 'numbered order' )
         *  - Level 2b:  'in-degree' vs 'out-degree': may be used to position nodes within their category 
         *      - positioning intermediate nodes closer to sources/sinks, depending on ratio of in vs out
         *      - position/laying out multiple 'layers' of sinks and sources to optimise layout of nodes 
         */ 

        // Classification flags
        const nodeCategoryFlag =  {
            source:                 'isSource', 
            sink:                   'isSink', 
            intermediate:           'isIntermediate',
            responsibleEntity:      'isResponsibleEntity',
            verticallyIntegrated:   'hasLoop'
        }

        // 1. byCategory 
        const byCategory = {}
        for(const [category, flag] of Object.entries(nodeCategoryFlag)){
            byCategory[category] = Object.values(node).filter( d => d.state.config[flag])
        }

        // 2. Intermediate groups: used for the grouping withing the 'intermediate network'
        const intermediateNodes = {
            source:         Object.values(node).filter( d => d.state.config.intermediate?.isSource && !d.state.config.intermediate?.isSink),
            sink:           Object.values(node).filter( d => d.state.config.intermediate?.isSink && !d.state.config.intermediate?.isSource),
            intermediate:   Object.values(node).filter( d => d.state.config.intermediate?.isIntermediate),
            unconnected:  {
                all: Object.values(node).filter( d => d.state.config.intermediate?.isUnconnected)
            }
        }

        /**
         *  NOT USED 3 to 5 : marked for removal
         */ 
        // 3. By essential waste service (RE-only)
        const byEssentialWasteService = {}
        for(const service of Object.keys(schema['essential-waste-services'])){
            byEssentialWasteService[service] = {}
            for(const [category, flag] of Object.entries(nodeCategoryFlag)){
                byEssentialWasteService[service][category] = Object.values(node).filter( d => d.state.config['essential-waste-services'].includes(service) && d.state.config[flag] )
            }
        }

        // 4. By service and category: expected to be for non-Responsible entities, where reported 
        const byService = {}
        for(const service of Object.keys(schema.services)){
            byService[service] = {}
            for(const [category, flag] of Object.entries(nodeCategoryFlag)){
                byService[service][category] = Object.values(node).filter( d => d.state.config.service.assigned.includes(service) && d.state.config[flag])
            }
        }

        // 5. byCategory and essential waste service
        const byCategory_essentialWasteService = {} // => NOT USED: marked for removal
        for(const [category, flag] of Object.entries(nodeCategoryFlag)){
            byCategory_essentialWasteService[category] = {}
            for(const service of Object.keys(schema['essential-waste-services'])){
                byCategory_essentialWasteService[category][service] = Object.values(node).filter( d => d.state.config['essential-waste-services'].includes(service) && d.state.config[flag])
            }
        }


        // => Return 
        return {
            byCategory,
            intermediateNodes,
            // Not used
            byService,
            byEssentialWasteService,
        }
    }

    // Calculate positioning sizing/dimensions 
    #calculateNodeLayout(){
        // Global variables
        const chartLength = this.config.dims.chart.width,              // Chart width (vertical layout) or height (horizontal layout)
            padding =  {        // As a proportion of node size    
                source:         this.config.dims.node.source.padding,       
                sink:           this.config.dims.node.sink.padding,         
                intermediate:   this.config.dims.node.intermediate.padding
            },
            nodeCount = {
                source:         this.node.cluster.byCategory.source.length,
                sink:           this.node.cluster.byCategory.sink.length,
                intermediate:   this.node.cluster.byCategory.intermediate.length
            }

        /**
         *  I. SOURCES: An assumption is made that the count of sources > sinks. 
         *  - Sources are laid out on two offset 'layers' to optimise packing along the edge
         *  - Note: ideally this would be further generalised to use the 'larger count' of sources or sinks. 
         *    However data seems significantly weighted to suppliers and this is unlikely to change materially
         */ 

        const source  = {
            length:          chartLength,       // Assume sources are the most prevalent node type
            count:  {
                total:        nodeCount.source,
                outer:        Math.ceil(nodeCount.source * 0.5),         // 1st layer: Full half 'outer' layer 
                inner:        Math.floor(nodeCount.source * 0.5),        // 2nd layer: Offset 'inner' layer            
            }
        }

        // Set source node size by calculating node and padding spacings across the chart area length
        source.nodeSize = chartLength / (source.count.outer + source.count.inner * padding.source)


        /**
         *  II. SINKS: use the same node size and padding to make them as visually comparable to sources
         */ 

        const sinkLayers = nodeCount.source / 2 > nodeCount.sink ? 1 : 2    // Determine if sinks need two layers 

        const sink = {
            nodeSize:       source.nodeSize,                        //  Use the same node size to ensure that there is no visual difference between sinks and source nodes
            count: {
                total:      nodeCount.sink,
                outer:      sinkLayers === 2 ? Math.ceil(nodeCount.sink * 0.5) : nodeCount.sink ,    // 1st (only) layer: Full half 'outer' layer 
                inner:      sinkLayers === 2 ? Math.floor(nodeCount.sink * 0.5) : null,             // 2nd (if requried) layer: Offset 'inner' layer
            },
            dims: {
                length:     undefined,
                nodeLength: undefined,
            }
        }

        sink.dims.length = sink.dims.nodeLength
                    = sink.nodeSize * sink.count.outer                    // Total node width
                    + padding.sink * sink.nodeSize * (sink.count.outer - 1)    // + total padding width

        /**
         *  III. INTERMEDIATE NODES
         */

        // i. Init intermediate node object
        const intermediate = {
            nodeSize:   undefined,                          
            count: {
                source:  {
                    all:       this.node.cluster.byCategory.source.length,           // intermediate source only
                },

                sink:  {
                    all:        this.node.cluster.byCategory.sink.length              // intermediate sink only
                },

                intermediate:  { 
                    all:            this.node.cluster.byCategory.intermediate.length,
                    source:         this.node.cluster.intermediateNodes.source.length,
                    intermediate:   this.node.cluster.intermediateNodes.intermediate.length,
                    sink:           this.node.cluster.intermediateNodes.sink.length,
                    sourceAndSink:  this.node.cluster.intermediateNodes.source.length + this.node.cluster.intermediateNodes.sink.length,
                    unconnected: {
                        all:        this.node.cluster.intermediateNodes.unconnected.all.length,
                        sideA: {},
                        sideB: {},
                    }
                }
            },
            dims: {
                unconnected: {
                    sideA: {},
                    sideB: {}
                },
                sink: {},
                intermediate: {},
                source: {},
                sourceAndSink: {}
            }
        }

        // ii. Layout variables for "unconnected" intermediate nodes: count unconnected: split to 'sides'
        const unconnectedNoGroups   = 2,         // Split to Each side
            unconnectedNoLayers     = 2,         // with two layers (offset)
            unconnectedLayerMaxNode = Math.ceil(intermediate.count.intermediate.unconnected.all / (unconnectedNoGroups * unconnectedNoLayers)) + 1

        // iii. Init intermediate object
        intermediate.count.intermediate.unconnected.sideA.all   = Math.ceil(intermediate.count.intermediate.unconnected.all * 0.5)
        intermediate.count.intermediate.unconnected.sideB.all   = Math.floor(intermediate.count.intermediate.unconnected.all * 0.5)                                          

        intermediate.count.intermediate.unconnected.sideA.layer1 = Math.ceil(intermediate.count.intermediate.unconnected.sideA.all * 0.5),
        intermediate.count.intermediate.unconnected.sideA.layer2 = intermediate.count.intermediate.unconnected.sideA.all  - (Math.ceil(Math.floor(intermediate.count.intermediate.all * 0.5) * 0.5)),

        intermediate.count.intermediate.unconnected.sideB.layer1 = Math.ceil(intermediate.count.intermediate.unconnected.sideB.all * 0.5),
        intermediate.count.intermediate.unconnected.sideB.layer2 = intermediate.count.intermediate.unconnected.sideB.all - (Math.ceil((intermediate.count.all - Math.ceil(intermediate.count.all) * 0.5) * 0.5))



        // iv. Calculate section pixel "lengths" (for 'offsetting' in layout)
            // a. Work out total width in 'node units' to calculate intermediateNodeSize
            const totalNodeLayerLength = unconnectedLayerMaxNode * 2 + this.node.cluster.intermediateNodes.intermediate.length,
                totalPaddingInNodes = (totalNodeLayerLength - 1) * padding.intermediate

            intermediate.nodeSize = chartLength / (totalNodeLayerLength + totalPaddingInNodes)

            // b. Calculate length in pixels of unconnected node sections (used for adding offsets to intermediate and second unconnected section)
            intermediate.dims.unconnected.sideA.length = intermediate.dims.unconnected.sideB.length 
                                                  = unconnectedLayerMaxNode * intermediate.nodeSize
                                                    + (unconnectedLayerMaxNode - 1) * padding.intermediate * intermediate.nodeSize

            intermediate.dims.unconnected.sideA.nodeLength = intermediate.nodeSize                           // Full width of first node
                                                        + (intermediate.count.intermediate.unconnected.sideA.all - 1)   // For ech additional node...
                                                            * (intermediate.nodeSize * 0.5 + padding.intermediate * intermediate.nodeSize * 0.5) // .. add half of width (size) and half of padding

            intermediate.dims.unconnected.sideB.nodeLength = intermediate.nodeSize                           // Full width of first node
                                                        + (intermediate.count.intermediate.unconnected.sideB.all - 1)   // For ech additional node...
                                                            * (intermediate.nodeSize * 0.5 + padding.intermediate * intermediate.nodeSize * 0.5) // .. add half of width (size) and half of padding

            // c. Calculate length of 'intermediate intermediates' 
            intermediate.dims.intermediate.length = intermediate.count.intermediate.intermediate * intermediate.nodeSize 
                                        + (intermediate.count.intermediate.intermediate - 1) * padding.intermediate * intermediate.nodeSize 

            // d. Calculate length of combined/interleaved 'intermediate source and sinks'
            const doubleSpace = intermediate.dims.sourceAndSink.doubleSpace = intermediate.count.intermediate.sourceAndSink < (intermediate.count.intermediate.intermediate - 1) * 0.5 ? true : false // Compare count to intermediate-intermediates to see if sourceAndSinks can be 'double spaced'

            intermediate.dims.sourceAndSink.length = (intermediate.count.intermediate.sourceAndSink * intermediate.nodeSize 
                                        + (intermediate.count.intermediate.sourceAndSink - 1) * padding.intermediate * intermediate.nodeSize) // "+2" top add padding to start and end
                                         * (doubleSpace ? 2 : 1)

        // => Return object
        return {
            source,
            sink,
            intermediate
        }

    }

    // Calculate unique link relationships
    #calculateLinkRelationships(){
        


        return {
            outer: {
                source: undefined,      // from source
                sink:   undefined       // to sink
            },
            intermediate: undefined
        }
    }

    // Sort intermediate nodes 
    #sortIntermediateNodes(intermediateNodes){

        /**
         *  I. INTERMEDIATE-INTERMEDIATE NODES:
         */
            // i. Along minor axis ('across'): sort by descending => mountain sort
            this.node.cluster.intermediateNodes.intermediate = sortIntermediatesMinor(this.node.cluster.intermediateNodes.intermediate)

            // ii. Along major axis: adds and calculates as 'sort level'
            this.node.cluster.intermediateNodes.intermediate = sortIntermediatesMajor(this.node.cluster.intermediateNodes.intermediate.filter( node =>  node.state.config.intermediate.isIntermediate ))

            // x. Sorting algorithms for intermediate network
            function sortIntermediatesMinor(nodes){

                // i. Init sortedNodes array
                let sortedNodes 

                // i. Sort nodes by network connected links
                nodes.sort( (a, b) =>{
                    const inDegreeA = Object.values(a.link.in).filter(link  => !link.config.isLoop && link.node.from.state.config?.intermediate?.isIntermediate).length,
                        outDegreeA  = Object.values(a.link.out).filter(link => !link.config.isLoop && link.node.to.state.config?.intermediate?.isIntermediate).length,
                        inDegreeB   = Object.values(b.link.in).filter(link  => !link.config.isLoop && link.node.from.state.config?.intermediate?.isIntermediate).length,
                        outDegreeB  = Object.values(b.link.out).filter(link => !link.config.isLoop && link.node.to.state.config?.intermediate?.isIntermediate).length

                    // Sort descending
                    return (inDegreeB + outDegreeB) - (inDegreeA + outDegreeA) 
                })

                // ii. Start sortedNodes with two most connected (a starting block of two most connected nodes)
                sortedNodes = [nodes[0], nodes[1]]

                // iii. Go through remaining nodes (from highest remaining degree to lowest) and insert each node around starting block based on connections
                const unsorted = []
                for(let i = sortedNodes.length; i < nodes.length; i++){
                    const node = nodes[i]
                    // Determine if there linked nodes already added to the sorted array
                    const linksToSortedNodes    = Object.values(node.link.out).filter(link => sortedNodes.includes(link.node.to)),
                        linksFromSortedNodes    = Object.values(node.link.in).filter(link => sortedNodes.includes(link.node.from)),
                        sortNodeLinks           = [...linksToSortedNodes, ...linksFromSortedNodes]

                    // Insert node in sortedArray at index of average linked nodes
                    if(sortNodeLinks.length > 0 ){
                        const nodesLinkedToIndexes = linksToSortedNodes.map(link => sortedNodes.indexOf(link.node.to)),
                            nodesLinkedFromIndexes = linksFromSortedNodes.map(link => sortedNodes.indexOf(link.node.from)),
                            linkedNodesIndexes     = [...nodesLinkedToIndexes, ...nodesLinkedFromIndexes],
                            insertIndex            = Math.round(d3.mean(linkedNodesIndexes)),
                            offset                 =  insertIndex < sortedNodes.length * 0.5 ? 0 : 1       // Insert to left if in the first half of current sorted nodes

                        sortedNodes.splice(insertIndex + offset, 0, node)

                    // Mark as unsorted
                    } else {
                        unsorted.push(node)
                    }
                }

                // iv. Go through unsorted nodes which should now have linked nodes in the sorted array
                unsorted.forEach(node => {
                    const linksToSortedNodes    = Object.values(node.link.out).filter(link => sortedNodes.includes(link.node.to)),
                        linksFromSortedNodes    = Object.values(node.link.in).filter(link => sortedNodes.includes(link.node.from)),
                        nodesLinkedToIndexes    = linksToSortedNodes.map(link => sortedNodes.indexOf(link.node.to)),
                        nodesLinkedFromIndexes  = linksFromSortedNodes.map(link => sortedNodes.indexOf(link.node.from)),
                        linkedNodesIndexes      = [...nodesLinkedToIndexes, ...nodesLinkedFromIndexes],
                        insertIndex             = Math.round(d3.mean(linkedNodesIndexes))

                    sortedNodes.splice(insertIndex, 0, node)
                })

                // v. Re-sort nonRE non-pair nodes
                const nonReIntermediateNodes = nodes.filter(d => !d.state.config.isResponsibleEntity && d.state.config.returnNodes.length === 0)
                nonReIntermediateNodes.forEach(node => {
                    const linksToSortedNodes    = Object.values(node.link.out).filter(link => sortedNodes.includes(link.node.to)),
                        linksFromSortedNodes    = Object.values(node.link.in).filter(link => sortedNodes.includes(link.node.from)),
                        nodesLinkedToIndexes    = linksToSortedNodes.map(link => sortedNodes.indexOf(link.node.to)),
                        nodesLinkedFromIndexes  = linksFromSortedNodes.map(link => sortedNodes.indexOf(link.node.from)),
                        linkedNodesIndexes      = [...nodesLinkedToIndexes, ...nodesLinkedFromIndexes],
                        insertIndex             = Math.round(d3.mean(linkedNodesIndexes))

                    // Remove node
                    const nodeIndex = sortedNodes.indexOf(node)
                    sortedNodes.splice(nodeIndex, 1)
                    // Re-insert node
                    sortedNodes.splice(insertIndex, 0, node)
                })

                // vi. Re-sort return pairs
                const returnNodes = nodes.filter(d => d.state.config.returnNodes.filter(node => node.state.config.isResponsibleEntity).length > 0)
                returnNodes.forEach(node => {
                    node.state.config.returnNodes.forEach(pairedNode => {
                        // Remove paired node
                        const pairedNodeIndex = sortedNodes.indexOf(pairedNode)
                        sortedNodes.splice(pairedNodeIndex, 1)

                        // Insert node before/after, dependind on where the orignal node position (i.e. put paired node 'outside')
                        const nodeIndex = sortedNodes.indexOf(node),
                            insertIndex = (nodeIndex < sortedNodes.length * 0.5) ? nodeIndex + 1 : nodeIndex 

                        sortedNodes.splice(insertIndex, 0, pairedNode)
                    })
                })

                // vii. Re-sort "thruple" nodes
                const pairs = nodes.filter(d => !d.state.config.isResponsibleEntity && d.state.config.returnNodes.length > 0)
                pairs.forEach( node => {
            
                    const linkToNodes = Object.values(node.link.out).map( link => link.node.to).filter(d => !d.state.config.intermediate.isSink),
                        pairedNodes =  node.state.config.returnNodes 

                    pairedNodes.forEach(pairedNode => {        
                        const pairedLinkToNodes =  Object.values(pairedNode.link.out).map( link => link.node.to).filter(d => !d.state.config.intermediate?.isSink)
                        // Reposition shared
                        const shared = linkToNodes.filter(d => pairedLinkToNodes.includes(d)).filter( d => d !== node && d !== pairedNode)
                        shared.forEach( sharedNode => {
                            // Remove shared node
                            const sharedNodeIndex = sortedNodes.indexOf(sharedNode)
                            sortedNodes.splice(sharedNodeIndex, 1)
                            // Insert shared node
                            const insertIndex = d3.min([sortedNodes.indexOf(node), sortedNodes.indexOf(pairedNode)])
                            sortedNodes.splice(insertIndex + 1, 0, sharedNode)
                        })
                    })
                })

                // => Return sorted nodes
                return sortedNodes
            }

            function sortIntermediatesMajor(nodes){
                /**
                    *  Sort returns nodes on a "SIX step" grid: with potential for adjustment within the grid
                    *  0: "tier0": No intermediate nodes in (i.e only from source-intermediate). Any of these 'tier0' nodes that have no intermediate out are adjusted
                    *  1: "tier1": One inter node in + outDegree > InDegree 
                    *  2: "tier1":One inter node in + InDegree < outDegree
                    *  3: -- Gap for further adjustment from 2 and 4 ---
                    *  4: "tier2": Multiple intermediate-node in + outDegree > InDegree
                    *  5  "tier2": Multiple intermediate-node in + outDegree < InDegree
                    */

                // Get nodes in 'intermediate-intermediate' network
                const reNodes = nodes.filter(d => d.state.config.isResponsibleEntity),
                    nonReNodes = nodes.filter(d => !d.state.config.isResponsibleEntity)

                // i. Init sort level for all intermediate-intermediate nodes 
                nodes.forEach( d => d.state.node.intermediateSort = { level: 1.5})    // Init prop and assign level 3 ('center')
                    
                // ii. Set sort level for link in counts to 'tiers'
                const reNodesInCount = reNodes.map(d => Object.values(d.link.in).filter(link => !link.config.isLoop).map(d => d.node.from).filter(d => d.state.config?.intermediate?.isIntermediate).length )
                reNodes.forEach( (d, i) => d.state.node.intermediateSort.level = reNodesInCount[i] === 0 ? 0 : reNodesInCount[i] === 1  ?  2 : 4)

                const tier0 = [...reNodes.filter(d => d.state.node.intermediateSort.level === 0)],     // Set aside to be repositioned between connecting nodes
                    tier1 = [...reNodes.filter(d => d.state.node.intermediateSort.level === 2)],       // Start at level '2' and adjust up to level 1
                    tier2 = [...reNodes.filter(d => d.state.node.intermediateSort.level === 4)]        // Start at level '4' and adjust down to level 5

                // iii. Adjust tier1 and tier2: Loop through intermediates and adjust sort level up/down based on link in/out comparison
                tier1.forEach( node => {
                    const nodeLevel = node.state.node.intermediateSort.level,
                        outIntermediateLinks = Object.values(node.link.out).filter(link => !link.config.isLoop && link.node.to.state.config?.intermediate?.isIntermediate && !link.node.to.state.config.returnNodes.includes(node)),
                        inIntermediatesLinks = Object.values(node.link.in).filter(link => !link.config.isLoop && link.node.from.state.config?.intermediate?.isIntermediate && !link.node.from.state.config.returnNodes.includes(node))

                    // Move up one level if node has more out links
                    if(outIntermediateLinks.length > inIntermediatesLinks.length){
                        node.state.node.intermediateSort.level = nodeLevel - 1
                    } 
                })

                tier2.forEach( node => {
                    const nodeLevel = node.state.node.intermediateSort.level,
                        outIntermediateLinks = Object.values(node.link.out).filter(link => !link.config.isLoop && link.node.to.state.config?.intermediate?.isIntermediate && !link.node.to.state.config.returnNodes.includes(node)),
                        inIntermediatesLinks = Object.values(node.link.in).filter(link => !link.config.isLoop && link.node.from.state.config?.intermediate?.isIntermediate && !link.node.from.state.config.returnNodes.includes(node))

                    // Move down one level based if node has more in links
                    if(outIntermediateLinks.length < inIntermediatesLinks.length){
                        node.state.node.intermediateSort.level = nodeLevel + 1
                    }
                })

                // iv. Adjust tier0 case where node is only connected to intermediate source and intermediate sink (i.e. no network links)
                tier0.forEach( node => {
                    const inNodes = Object.values(node.link.in).filter(link => !link.config.isLoop && link.node.from.state.config?.intermediate?.isIntermediate && !link.node.from.state.config.returnNodes.includes(node)).map(d => d.node.from),
                        outNodes = Object.values(node.link.out).filter(link => !link.config.isLoop && link.node.to.state.config?.intermediate?.isIntermediate && !link.node.to.state.config.returnNodes.includes(node)).map(d => d.node.to)

                    if(inNodes.length === 0 && outNodes.length === 0 ){
                        //  node.state.node.intermediateSort.level = 2
                    }   
                })

                // iv. Adjust any intermediate nodes
                nodes.forEach( (node, i) => {
                    const inNodes = Object.values(node.link.in).filter(link => !link.config.isLoop && link.node.from.state.config?.intermediate?.isIntermediate && !link.node.from.state.config.returnNodes.includes(node)).map(d => d.node.from)
                    const outNodes = Object.values(node.link.out).filter(link => !link.config.isLoop && link.node.to.state.config?.intermediate?.isIntermediate && !link.node.to.state.config.returnNodes.includes(node)).map(d => d.node.to)

                    if(inNodes.length === 1 && outNodes.length === 1 ){
                        const inNodeLevel   =  inNodes[0].state.node.intermediateSort.level ,
                            outNodeLevel    =  outNodes[0].state.node.intermediateSort.level, 
                            inNodeIndex     = nodes.indexOf(inNodes[0]),
                            outNodeIndex    = nodes.indexOf(outNodes[0]),
                            nodeToIn        = Math.abs(i - inNodeIndex),
                            nodeToOut       = Math.abs(i - outNodeIndex),
                            indexRange       = Math.abs(inNodeIndex - outNodeIndex)

                        // Set to average sort level of connected nodes
                        node.state.node.intermediateSort.level =  (inNodeLevel * nodeToOut / indexRange) +  (outNodeLevel * nodeToIn / indexRange)
                    }
                })

                // vi. Adjust tier1 and tier 2 for tied intra-links: first loop to detect adjustments 'back' and second for 'forward'
                const tiers = [tier1, tier2]

                tiers.forEach( tier => {

                    tier.forEach( (node, i, nodes) => {
                        // i. Count connections of siblings (same sort level) in and out
                        const siblingNodes  = nodes.filter(d => d !== node && d.state.node.intermediateSort.level === node.state.node.intermediateSort.level ),
                            connectedIn     = siblingNodes.map( d => Object.values(d.link.out).map( link => link.node.to).filter(d => d === node)).filter(d => d.length > 0),
                            connectedOut    = siblingNodes.map( d => Object.values(d.link.in).map( link => link.node.from).filter(d => d === node)).filter(d => d.length > 0)

                        // ii. Adjust 'back' nodes with no sibling connections 
                        if(connectedOut.length ===  0 && connectedIn.length === 0){
                            node.state.node.intermediateSort.level -= 0.5
                        }
                        // ii. Adjust 'back'nodes with connections out but not in
                        if(connectedOut.length > 0 && connectedIn.length === 0){
                            node.state.node.intermediateSort.level -= 0.5
                        }
                    })

                    tier.forEach( (node, i, nodes) => {
                        // i. Count connections of siblings (same sort level) in and out
                        const siblingNodes  = nodes.filter(d => d !== node && d.state.node.intermediateSort.level === node.state.node.intermediateSort.level ),
                            connectedIn     = siblingNodes.map( d => Object.values(d.link.out).map( link => link.node.to).filter(d => d === node)).filter(d => d.length > 0),
                            connectedOut    = siblingNodes.map( d => Object.values(d.link.in).map( link => link.node.from).filter(d => d === node)).filter(d => d.length > 0)

                        // ii. Adjust 'forward' connections with in but not out => 'adjust back'
                        if(connectedIn.length > 0 && connectedOut.length === 0){
                            node.state.node.intermediateSort.level += 0.5
                        }
                    })

                })

                // vii. Re-adjust any intermediate nodes
                nodes.forEach( (node, i) => {
                    const inNodes = Object.values(node.link.in).filter(link => !link.config.isLoop && link.node.from.state.config?.intermediate?.isIntermediate && !link.node.from.state.config.returnNodes.includes(node)).map(d => d.node.from),
                        outNodes = Object.values(node.link.out).filter(link => !link.config.isLoop && link.node.to.state.config?.intermediate?.isIntermediate && !link.node.to.state.config.returnNodes.includes(node)).map(d => d.node.to)

                    // Check for three node loop: node to > node to


                    if(inNodes.length === 1 && outNodes.length === 1 ){
                        const inNode        = inNodes[0],
                            outNode         = outNodes[0],
                            inNodeLevel     = inNode.state.node.intermediateSort.level ,
                            outNodeLevel    = outNode.state.node.intermediateSort.level, 
                            inNodeIndex     = nodes.indexOf(inNode),
                            outNodeIndex    = nodes.indexOf(outNode),
                            nodeToIn        = Math.abs(i - inNodeIndex),
                            nodeToOut       = Math.abs(i - outNodeIndex),
                            indexRange      = Math.abs(inNodeIndex - outNodeIndex)

                        // Calculate average and weighted average (for straightened intermediate)
                        const weightedAverage = (inNodeLevel * nodeToOut / indexRange) +  (outNodeLevel * nodeToIn / indexRange),
                            average = d3.mean([inNodeLevel, outNodeLevel])

                        // Check if out node has a link that returns the in Noe
                        const isTriangleLoop = Object.values(outNode.link.out).map(link => link.node.to).includes(inNode)

                        // Set to average sort level of connected nodes
                        // node.state.node.intermediateSort.level =  isTriangleLoop ? average : weightedAverage
                        node.state.node.intermediateSort.level =  average 
                    }
                })


                // viii. Set nonRE pairs to same level as REs
                const nonReWithReturn = nonReNodes.filter(d => d.state.config.returnNodes.length > 0)
                nonReWithReturn.forEach(node => {
                    node.state.config.returnNodes.forEach(pairedNode => {
                        node.state.node.intermediateSort.level = pairedNode.state.node.intermediateSort.level        
                    })
                })

                // ix. Set "thruple" nodes to same as piare
                const pairs = nodes.filter(d => !d.state.config.isResponsibleEntity && d.state.config.returnNodes.length > 0)
                pairs.forEach( node => {
            
                    const linkToNodes = Object.values(node.link.out).map( link => link.node.to).filter(d => !d.state.config.intermediate.isSink)
                    const pairedNodes =  node.state.config.returnNodes 

                    pairedNodes.forEach(pairedNode => {
                        const pairedLinkToNodes =  Object.values(pairedNode.link.out).map( link => link.node.to).filter(d => !d.state.config.intermediate?.isSink)

                        // Check for shared
                        const shared = linkToNodes.filter(d => pairedLinkToNodes.includes(d)).filter( d => d !== node && d !== pairedNode)

                        // Reposition shared
                        shared.forEach( sharedNode => {
                            sharedNode.state.node.intermediateSort = node.state.node.intermediateSort 
                        })
                    })
                })


                // Return 
                return nodes
            }

        /**
         *  II. INTERMEDIATE SOURCE AND SINK: Minor axis: sorted by average position of intermediate connected nodes and interleaved to offset intermediate source and sinks
         */

            // i. Sort intermediate source: 
            this.node.cluster.intermediateNodes.source.sort((a, b) => {
                const interNodeToA = d3.mean(Object.values(a.link.out).map(link => link.node.to).filter(node => node.state.config?.intermediate?.isIntermediate).map(node => this.node.cluster.intermediateNodes.intermediate.indexOf(node))),
                    interNodeToB = d3.mean(Object.values(b.link.out).map(link => link.node.to).filter(node => node.state.config?.intermediate?.isIntermediate).map(node => this.node.cluster.intermediateNodes.intermediate.indexOf(node)))

                return interNodeToB - interNodeToA
            })

            // ii. Sort intermediate sink: 
            this.node.cluster.intermediateNodes.sink.sort((a, b) => {
                const interNodeFromA = d3.mean(Object.values(a.link.in).map(link => link.node.from).filter(node => node.state.config?.intermediate?.isIntermediate).map(node => this.node.cluster.intermediateNodes.intermediate.indexOf(node))),
                    interNodeFromB = d3.mean(Object.values(b.link.in).map(link => link.node.from).filter(node => node.state.config?.intermediate?.isIntermediate).map(node => this.node.cluster.intermediateNodes.intermediate.indexOf(node)))

                return interNodeFromB - interNodeFromA
            })

            // iii. Join/merge sources and sinks as an interleaved cluster
            this.node.cluster.intermediateNodes.sourceAndSink = join.interleaveBalanced(this.node.cluster.intermediateNodes.source, this.node.cluster.intermediateNodes.sink)

        // => Return array of all intermediate nodes
        return [
            ...this.node.cluster.intermediateNodes.unconnected.all,
            ...this.node.cluster.intermediateNodes.sourceAndSink,
            ...this.node.cluster.intermediateNodes.intermediate
        ]
    }

    // Sort source and sink nodes
    #sortSourceAndSinkNodes(){

        /**
         *  1. SOURCE NODES: Minor axis
         */ 
        const sourceCenterMultiLinks = true             // Sort option
        const sourceCenterMultiLinksMountain = false    // Sort option

        // a. Spilt single and multi link nodes and reinsert multilink in center (with m)
        if (sourceCenterMultiLinks){

            // i. Sort single link by position of target
            let sourceSingleLink = this.node.cluster.byCategory.source.filter(d => Object.values(d.link.out).length === 1)
            sourceSingleLink.sort((a, b) => {
                const nodeOutPositionA = d3.mean(Object.values(a.link.out).map(d => d.node.to.state.node.position.center.x)),
                    nodeOutPositionB = d3.mean(Object.values(b.link.out).map(d => d.node.to.state.node.position.center.x))

                return nodeOutPositionA - nodeOutPositionB
            })

            // ii.  Sort descending 
            let sourceMultiLink = this.node.cluster.byCategory.source.filter(d => Object.values(d.link.out).length > 1)

            if(sourceCenterMultiLinksMountain){ // >  Mountain sort multi link
                sourceMultiLink.sort((a, b) => {
                    const linkOutDegreeA = Object.values(a.link.out).length,
                        linkOutDegreeB = Object.values(b.link.out).length
                    return linkOutDegreeB - linkOutDegreeA
                })
                sourceMultiLink = sort.mountainSort(sourceMultiLink)


            } else { // 
                sourceMultiLink.sort((a, b) => {
                    const nodeOutPositionA = d3.mean(Object.values(a.link.out).map(d => d.node.to.state.node.position.center.x)),
                        nodeOutPositionB = d3.mean(Object.values(b.link.out).map(d => d.node.to.state.node.position.center.x))

                    return nodeOutPositionA - nodeOutPositionB
                })

            }

            // iii. Splice/merge sorted multi link into single link (at center)
            this.node.cluster.byCategory.source = insert.arrayInMiddle( sourceSingleLink, sourceMultiLink)

        } else {

            this.node.cluster.byCategory.source.sort((a, b) => {
                const nodeOutPositionA = d3.mean(Object.values(a.link.out).map(d => d.node.to.state.node.position.center.x)),
                    nodeOutPositionB = d3.mean(Object.values(b.link.out).map(d => d.node.to.state.node.position.center.x))

                return nodeOutPositionA - nodeOutPositionB
            })
        }


        /**
         * 2. SINK NODES: Minor axis
         */ 
        // i. Sort single link by position of target
        this.node.cluster.byCategory.sink.sort((a, b) => {
            const nodeOutPositionA = d3.mean(Object.values(a.link.in).map(d => d.node.from.state.node.position.center.x)),
                nodeOutPositionB = d3.mean(Object.values(b.link.in).map(d => d.node.from.state.node.position.center.x))

            return nodeOutPositionA - nodeOutPositionB
        })

        // => Return
        return [
            ...this.node.cluster.byCategory.source,
            ...this.node.cluster.byCategory.sink,
        ]
    }

    // Assemble node and link data for convenience/referencing for rendering (see main.js)
    #assembleRenderData(){
        const cluster = this.node.cluster, 
            layout = this.node.layout

        // a. Get node data by node type
        const nodeData = {
            source:             cluster.byCategory.source,
            sink:               cluster.byCategory.sink,
            intermediate:{
                source:         cluster.intermediateNodes.source,
                intermediate:   cluster.intermediateNodes.intermediate,
                sink:           cluster.intermediateNodes.sink,
                unconnected: { // Sides
                    sideA:      cluster.intermediateNodes.unconnected.all.slice(0, layout.intermediate.count.intermediate.unconnected.sideA.all),
                    sideB:      cluster.intermediateNodes.unconnected.all.slice(layout.intermediate.count.intermediate.unconnected.sideA.all)
                }
            }
        }

        // b. Get link data by node out type
        const linkData = {
            source:     nodeData.source.map(d => Object.values(d.link.out)).flat(),
            intermediate: {
                unconnected: {
                    sideA:      nodeData.intermediate.unconnected.sideA.map(d => Object.values(d.link.out)).flat(),
                    sideB:      nodeData.intermediate.unconnected.sideB.map(d => Object.values(d.link.out)).flat(),
                },
                intermediate:   nodeData.intermediate.intermediate.map(d => Object.values(d.link.out)).flat(),
                source:         nodeData.intermediate.source.map(d => Object.values(d.link.out)).flat(),
                sink:           nodeData.intermediate.sink.map(d => Object.values(d.link.out)).flat(),
            }
        }

        // Return
        return {nodeData, linkData}
    }

    // Calculate scales for nodes and links (where required)
    #calculateScales(node, link){

        /**
         *  I. NODE SCALE OPTIONS
         *  - Multiple scale options (e.g. in, out and in + out degree) are calculated to provide scaling options
         */ 
        const nodeArray = Object.values(node)       // Array of all nodes

        // i. Init data object and get link data for each group of nodes (i.e. filtered nodeArray) 
        const data = {
            node: {
                source: {
                    outDegree: {
                        links:  nodeArray.filter(d => d.state.config.isSource).map(d => Object.values(d.link.out)),
                    },
                    service:   [...new Set(nodeArray.filter(d => d.state.config.isSource).map(d => d.state.config.service.assigned).flat())].sort()
                },
                sink: {
                    inDegree: {
                        links:  nodeArray.filter(d => d.state.config.isSink).map(d => Object.values(d.link.in))
                    },
                    service:   [...new Set(nodeArray.filter(d => d.state.config.isSink).map(d => d.state.config.service.assigned).flat())].sort()

                },
                intermediate: {
                    nonResponsibleEntity: {
                        inDegree: {
                            links:  nodeArray.filter(d => !d.state.config.isResponsibleEntity && d.state.config.isIntermediate).map(d => Object.values(d.link.in))
                        },
                        outDegree: {
                            links:  nodeArray.filter(d => !d.state.config.isResponsibleEntity && d.state.config.isIntermediate).map(d => Object.values(d.link.out))
                        },
                        inOutDegree: {}
                    },
                    responsibleEntity: {
                        inDegree: {
                            links:  nodeArray.filter(d => d.state.config.isResponsibleEntity && d.state.config.isIntermediate).map(d => Object.values(d.link.in))
                        },
                        outDegree: {
                            links:  nodeArray.filter(d => d.state.config.isResponsibleEntity && d.state.config.isIntermediate).map(d => Object.values(d.link.out))
                        },
                        inOutDegree: {},
                        loop: {
                            links:  nodeArray.filter(d => d.state.config.isResponsibleEntity && d.state.config.hasLoop).map(d => Object.values(d.link.out).filter(link => link.config.isLoop) )
                        }
                    },
                    service:    [...new Set(nodeArray.filter(d => d.state.config.isIntermediate && !d.state.config.isResponsibleEntity).map(d => d.state.config.service.assigned).flat())].sort()
                }
            }
        }


        // ii. Add counts of link in/out degree for use in setting scale domains for nodes
        data.node.source.outDegree.distribution = [...new Set(data.node.source.outDegree.links.map(d => d.length))].sort( (a, b) => a - b)
        data.node.source.outDegree.min          = d3.min(data.node.source.outDegree.distribution)
        data.node.source.outDegree.max          = d3.max(data.node.source.outDegree.distribution)

        data.node.sink.inDegree.distribution = [...new Set(data.node.sink.inDegree.links.map(d => d.length))].sort( (a, b) => a - b)
        data.node.sink.inDegree.min          = d3.min(data.node.sink.inDegree.distribution)
        data.node.sink.inDegree.max          = d3.max(data.node.sink.inDegree.distribution)

        data.node.intermediate.nonResponsibleEntity.inDegree.distribution   = [...new Set(data.node.intermediate.nonResponsibleEntity.inDegree.links.map(d => d.length))].sort( (a, b) => a - b)
        data.node.intermediate.nonResponsibleEntity.inDegree.min            = d3.min(data.node.intermediate.nonResponsibleEntity.inDegree.distribution)
        data.node.intermediate.nonResponsibleEntity.inDegree.max            = d3.max(data.node.intermediate.nonResponsibleEntity.inDegree.distribution)

        data.node.intermediate.nonResponsibleEntity.outDegree.distribution  = [...new Set(data.node.intermediate.nonResponsibleEntity.outDegree.links.map(d => d.length))].sort( (a, b) => a - b)
        data.node.intermediate.nonResponsibleEntity.outDegree.min           = d3.min(data.node.intermediate.nonResponsibleEntity.outDegree.distribution)
        data.node.intermediate.nonResponsibleEntity.outDegree.max           = d3.max(data.node.intermediate.nonResponsibleEntity.outDegree.distribution)

        data.node.intermediate.nonResponsibleEntity.inOutDegree.links       = data.node.intermediate.nonResponsibleEntity.outDegree.links.concat(data.node.intermediate.nonResponsibleEntity.inDegree.links) 
        data.node.intermediate.nonResponsibleEntity.inOutDegree.distribution = [...new Set( data.node.intermediate.nonResponsibleEntity.inOutDegree.links.map(d => d.length)) ] .sort( (a, b) => a - b)
        data.node.intermediate.nonResponsibleEntity.inOutDegree.min         = d3.min(data.node.intermediate.nonResponsibleEntity.inOutDegree.distribution)
        data.node.intermediate.nonResponsibleEntity.inOutDegree.max         = d3.max(data.node.intermediate.nonResponsibleEntity.inOutDegree.distribution)

        data.node.intermediate.responsibleEntity.inDegree.distribution      = [...new Set(data.node.intermediate.responsibleEntity.inDegree.links.map(d => d.length))].sort( (a, b) => a - b)
        data.node.intermediate.responsibleEntity.inDegree.min               = d3.min(data.node.intermediate.responsibleEntity.inDegree.distribution)
        data.node.intermediate.responsibleEntity.inDegree.max               = d3.max(data.node.intermediate.responsibleEntity.inDegree.distribution)

        data.node.intermediate.responsibleEntity.outDegree.distribution     = [...new Set(data.node.intermediate.responsibleEntity.outDegree.links.map(d => d.length))].sort( (a, b) => a - b)
        data.node.intermediate.responsibleEntity.outDegree.min              = d3.min(data.node.intermediate.responsibleEntity.outDegree.distribution)
        data.node.intermediate.responsibleEntity.outDegree.max              = d3.max(data.node.intermediate.responsibleEntity.outDegree.distribution)

        data.node.intermediate.responsibleEntity.inOutDegree.links          = data.node.intermediate.responsibleEntity.outDegree.links.concat(data.node.intermediate.responsibleEntity.inDegree.links) 
        data.node.intermediate.responsibleEntity.inOutDegree.distribution   = [...new Set( data.node.intermediate.responsibleEntity.inOutDegree.links.map(d => d.length)) ] .sort( (a, b) => a - b)
        data.node.intermediate.responsibleEntity.inOutDegree.min            = d3.min(data.node.intermediate.responsibleEntity.inOutDegree.distribution)
        data.node.intermediate.responsibleEntity.inOutDegree.max            = d3.max(data.node.intermediate.responsibleEntity.inOutDegree.distribution)

        data.node.intermediate.responsibleEntity.loop.distribution          = [...new Set( data.node.intermediate.responsibleEntity.loop.links.map(d => d.length)) ] .sort( (a, b) => a - b)
        data.node.intermediate.responsibleEntity.loop.min                   = d3.min(data.node.intermediate.responsibleEntity.loop.distribution)
        data.node.intermediate.responsibleEntity.loop.max                   = d3.max(data.node.intermediate.responsibleEntity.loop.distribution)

        // iii. Calculate node scale
        const nodeSize = {
            intermediate:   this.node.layout.intermediate.nodeSize
        }

        const nodeScale = {
                sourceAndSink:  d3.scalePow().domain(d3.extent([...data.node.source.outDegree.distribution, ...data.node.sink.inDegree.distribution]))
                                    .range([0.5, 1])
                                    .exponent(0.05),  // Required because of abnormally large node (LGA)
                source: {
                    outDegree:  d3.scalePow().domain(d3.extent(data.node.source.outDegree.distribution))
                                    .range([0.5, 1])
                                    .exponent(0.05),  // Required because of abnormally large node (LGA)
                    service:    data.node.source.service
                },
                sink: {
                    inDegree:   d3.scaleLinear().domain(d3.extent(data.node.sink.inDegree.distribution))
                                    .range([0.5, 1]),
                    service:    data.node.sink.service
                },
                intermediate: {
                    nonResponsibleEntity: {
                        inDegree:       d3.scaleSqrt().domain(d3.extent(data.node.intermediate.nonResponsibleEntity.inDegree.distribution)),
                        outDegree:      d3.scaleSqrt().domain(d3.extent(data.node.intermediate.nonResponsibleEntity.outDegree.distribution)),
                        inOutDegree:    d3.scaleSqrt().domain(d3.extent(data.node.intermediate.nonResponsibleEntity.inOutDegree.distribution)),
                        service:        data.node.intermediate.service
                    },
                    responsibleEntity: {
                        inDegree:       d3.scaleSqrt().domain(d3.extent(data.node.intermediate.responsibleEntity.inDegree.distribution))
                                            .range([nodeSize.intermediate * this.config.dims.node.intermediate.scale.min, 
                                                    nodeSize.intermediate * this.config.dims.node.intermediate.scale.max]),
                        outDegree:      d3.scaleSqrt().domain(d3.extent(data.node.intermediate.responsibleEntity.outDegree.distribution))
                                            .range([nodeSize.intermediate * this.config.dims.node.intermediate.scale.min, 
                                                    nodeSize.intermediate * this.config.dims.node.intermediate.scale.max]),
                        inOutDegree:    d3.scaleSqrt().domain(d3.extent(data.node.intermediate.responsibleEntity.inOutDegree.distribution))
                                            .range([nodeSize.intermediate * this.config.dims.node.intermediate.scale.min, 
                                                    nodeSize.intermediate * this.config.dims.node.intermediate.scale.max]),
                        loop:           d3.scaleSqrt().domain(d3.extent(data.node.intermediate.responsibleEntity.loop.distribution))
                    }
                }
        }

        const linkScale = {
            taperScale: d3.scaleLinear()
                            .domain([1, 5])       // Manually checked/set
                            .range([this.node.layout.intermediate.nodeSize * 0.2, this.node.layout.intermediate.nodeSize * 0.75])  ,      
            taperEnd:   this.node.layout.intermediate.nodeSize * 0.05

        }

        return {
            node: nodeScale,
            link: linkScale
        }
    }

    #updateNodePositions(sortedNodes){

        // ii. Init node counter
        const nodeCount = {
            source: 0,
            intermediate: {
                all:                0,
                unconnected:        0,
                source:             0,
                intermediate:       0,
                sink:               0,
                sourceAndSink:      0,
                responsibleEntity:  0,
            },
            sink:   0
        }

        // iii. Update node position and layout "size" (i.e. spacing)
        for(const node of sortedNodes){

            // 1. Source nodes
            if(node.state.config.isSource){
                // Update size and position
                this.updateNodeSize(node, 'source')
                this.updateNodePosition(node, 'source', nodeCount.source)
                // Update counter
                nodeCount.source++
            }

            // 2. Intermediate nodes
            if(node.state.config.isIntermediate){

                // Update nodes by intermediateType
                const intermediateTypes = {
                    unconnected:    'isUnconnected', 
                    source:         'isSource',
                    sink:           'isSink', 
                    intermediate:   'isIntermediate'
                }

                for( const [type , flagProp] of Object.entries(intermediateTypes)){

                    if(node.state.config.intermediate[flagProp]){
                        // Update size and position
                        this.updateNodeSize(node, `intermediate-${type}`) 

                        if( type === 'sink' || type === 'source'){
                            this.updateNodePosition(node, `intermediate-${type}`, nodeCount.intermediate.sourceAndSink)
                            nodeCount.intermediate.sourceAndSink++
                        } else {
                            this.updateNodePosition(node, `intermediate-${type}`, nodeCount.intermediate[type])
                        }
            
                        // Update counter
                        nodeCount.intermediate[type]++
                    }
                }

                // Update counter
                nodeCount.intermediate.all++
            }

            // 3. Sink nodes
            if(node.state.config.isSink){
                // Update size and position
                this.updateNodeSize(node, 'sink')
                this.updateNodePosition(node, 'sink', nodeCount.sink)

                // Update counter
                nodeCount.sink++
            }
        }
    }

    #updateLinkPaths(link){

        // i. Init link counter
        const linkCount = {
            out: {
                source:                 0,
                intermediate: {
                    all:                0,
                    unconnected:        0,
                    source:             0,
                    intermediate:       0,
                    sink:               0,
                    responsibleEntity:  0,
                }
            },
            in: {
                sink:                 0,
                intermediate: {
                    all:                0,
                    unconnected:        0,
                    source:             0,
                    intermediate:       0,
                    sink:               0,
                    responsibleEntity:  0,
                }
            }
        }

        // ii. Update link paths 
        for(const linkInstance of Object.values(link)){
            this.updateLinkPath(linkInstance)
        }
    }

    ///////////////////////
    /// PUBLIC METHODS  ///
    ///////////////////////

    updateNodeSize(node, type){
        const {source, sink, intermediate} = this.node.layout

        switch(type){
            case 'source':
                node.state.node.size.width = source.nodeSize
                node.state.node.size.height = source.nodeSize * this.config.dims.node.source.majorRatio
                break

            case 'sink':
                node.state.node.size.width  = sink.nodeSize
                node.state.node.size.height = sink.nodeSize * this.config.dims.node.sink.majorRatio
                break

            case 'intermediate-unconnected':
            case 'intermediate-intermediate':
            case 'intermediate-source':
            case 'intermediate-sink':
                node.state.node.size.width  = intermediate.nodeSize
                node.state.node.size.height = intermediate.nodeSize
                break
        }
    }

    updateNodePosition(node, type, index){
        const { source, sink, intermediate } = this.node.layout

        const nodeCluster = this.node.cluster,
            dims = this.config.dims,
            chartMajorLength = dims.chart.height,
            chartMinorLength = dims.chart.width

        let nodeCount = 0, nodeLayerNo, nodeSize, padding, groupOffset, intermediateType


        // Positioning function is potentially layout specific
        switch(type){
            case 'source':
                // i. Get node size, padding and get layer position
                nodeSize    = source.nodeSize
                padding     = dims.node.source.padding * nodeSize
                nodeCount   = index % source.count.outer
                nodeLayerNo = index % 2

                // ii. Set x position
                node.state.node.position.center.x = (nodeSize * 0.5)           // Offset to center of node + half to start on zero
                                                    + nodeSize * index         // Width of node

                // iii. Set y position
                const layerOffset = nodeLayerNo
                node.state.node.position.center.y = nodeSize * this.config.dims.node.source.majorRatio * 0.5            // Offset to ensure node is inside chart area
                                                    + chartMajorLength * dims.nodeCluster.source                        // Offset for group positioning
                                                    + nodeLayerNo * (nodeSize * (1 + dims.node.source.padding)) * (this.config.dims.node.source.majorRatio - 1)     // Offset for second layer

                node.state.node.sourceLayer = nodeLayerNo
                break

            case 'sink':
                // i. Get node size, padding and get layer position
                nodeCount   = index % sink.count.outer
                nodeLayerNo = Math.floor(index / sink.count.outer)
                nodeSize    = sink.nodeSize
                padding     = dims.node.sink.padding * nodeSize

                const sinkGroupOffset = chartMinorLength * 0.5 - sink.dims.length * 0.5

                // ii. Set x position
                node.state.node.position.center.x = sinkGroupOffset +
                                                    + nodeLayerNo * ((nodeSize + padding) * 0.5)     // Offset for second layer
                                                    + nodeSize * nodeCount         // Width of node
                                                    + padding * nodeCount           // Padding

                // iii. Set y position
                node.state.node.position.center.y = - nodeSize * this.config.dims.node.sink.majorRatio * 0.5                                           // Offset to ensure node is inside chart
                                                    + chartMajorLength * dims.nodeCluster.sink          // Offset for group positioning
                                                    - nodeLayerNo * (nodeSize * (1 + dims.node.sink.padding)) * (this.config.dims.node.source.majorRatio - 1)  // Offset for second layer (if required)

                node.state.node.sinkLayer = nodeLayerNo
                break

            case 'intermediate-unconnected':
                // i. Get node size, padding and get layer position
                nodeSize    = intermediate.nodeSize  
                padding     = dims.node.intermediate.padding * nodeSize   
                intermediateType = type.slice(13)

                // i. Get 'side' of node and 'layer' on each each
                const side = index < intermediate.count.intermediate.unconnected.sideA.all ? 'sideA' : 'sideB',
                    sideNodeCount = index % intermediate.count.intermediate.unconnected.sideA.all

                nodeCount = sideNodeCount % intermediate.count.intermediate.unconnected[side].layer1    
                nodeLayerNo = Math.floor(index / intermediate.count.intermediate.unconnected[side].layer1 % 2)  

                // ii. Calculate side offset (centered for actual number of nodes)
                const sideLength = intermediate.dims.unconnected[side].length,              // This length is dependent on total unconnected nodes and equal for each side 
                    nodeLength   = intermediate.dims.unconnected[side].nodeLength,           // This is the length of the actual no. nodes and padding (in the layer layout)
                    side_offset  = side === 'sideA' ? (sideLength - nodeLength) * 0.5 
                                        : (sideLength - nodeLength) * 0.5 + chartMinorLength - intermediate.dims.unconnected.sideB.length 

                // iii. Set x position
                node.state.node.position.center.x =  (nodeSize * 1.5)               // Offset to center of node
                                                    + nodeLayerNo * ((nodeSize + padding) * 0.5)     // Offset for second layer
                                                    + nodeSize * nodeCount          // Width of node
                                                    + padding * (nodeCount - 1)     // Padding
                                                    + side_offset
                                                        
                // iv. Set y position
                node.state.node.position.center.y = chartMajorLength * dims.nodeCluster.intermediate.unconnected  // Main 'flow-axis' layout positioning
                                                    + nodeLayerNo * padding * 1.5           // Layer position
                                                    - ( padding * 1.5) * 0.5                // Offset for layer padding
                break

            case 'intermediate-intermediate':
                // i. Get node size, padding and get layer position
                nodeCount   = index   
                nodeSize    = intermediate.nodeSize  
                padding     = dims.node.intermediate.padding * nodeSize   
                intermediateType = type.slice(13)

                // ii. Calculate offset for group (minor axis)
                groupOffset = chartMinorLength * 0.5 - intermediate.dims.intermediate.length * 0.5 

                // ii. Set x position
                node.state.node.position.center.x = (nodeSize * 1.5)               // Offset to center of node
                                                    + nodeSize * nodeCount          // Width of node
                                                    + (padding * (nodeCount - 1))   // Padding
                                                    + groupOffset 
                // iii. Set y position
                const gridSteps   = 6           // This is manually set from the layout
                const interOffsetScale = d3.scaleLinear()
                                            .domain([0, gridSteps -1])
                                            .range([
                                                chartMajorLength * dims.nodeCluster.intermediate.intermediate.start, 
                                                chartMajorLength * dims.nodeCluster.intermediate.intermediate.end 
                                            ])

                node.state.node.position.center.y = interOffsetScale(node.state.node.intermediateSort.level) * 1
                                                    + chartMajorLength * 0

                break
          
            case 'intermediate-source':
            case 'intermediate-sink':
                // i. Get node size, padding and get layer position
                nodeCount   = index  
                nodeSize    = intermediate.nodeSize  
                padding     = dims.node.intermediate.padding * nodeSize     

                // i. Calculate offsets for group: typeOffset is used to offset sinks vs sources
                groupOffset = chartMinorLength * 0.5 - intermediate.dims.sourceAndSink.length * 0.5
                const typeOffset = type === 'intermediate-source' ? chartMajorLength * dims.nodeCluster.intermediate.source - nodeSize * 0.25    
                                                    : chartMajorLength * dims.nodeCluster.intermediate.sink


                // ii. Set x position
                const doubleSpace = intermediate.dims.sourceAndSink.doubleSpace     // Check if sourceAndSink interleaved nodes are double spaced

                node.state.node.position.center.x = ((nodeSize * 1.5)               // Offset to center of node
                                                    + nodeSize * nodeCount          // Width of node
                                                    + (padding * (nodeCount - 1)))   // Padding
                                                    * (doubleSpace ? 2 : 1)
                                                    + groupOffset                                                     
                // iii. Set y position
                node.state.node.position.center.y = typeOffset

                break
        }
    }

    updateLinkPath(link){

        // Config
        const networkLinkStyle = this.config.option.link.network
        // Coordinates
        const fromNode = link.node.from,
            toNode = link.node.to

        const startPoint = {
            x: fromNode.state.node.position.center.x,  
            y: fromNode.state.node.position.center.y
        }
        const endPoint = {
            x: toNode.state.node.position.center.x, 
            y: toNode.state.node.position.center.y
        }

        const  dims = this.config.dims,
            chartMajorLength = dims.chart.height,
            chartMinorLength = dims.chart.width

        /**
         *  1. "INTERMEDIATE-NETWORK" links
         */ 
        if(link.node.from.state.config.isIntermediate && link.node.to.state.config.isIntermediate){
            // a. Determine path "weight" from count of how many links have the same to and from
            const repeatedLinkCount = Object.values(fromNode.link.out).filter(link => link.node.to === toNode).length,
                repeatedLinkScaling = this.config.dims.link.intermediate.repeatedLinkWeightFactor

            // b. "Return links: are rendered as a curve
            if(link.config.isReturn){
                // i. Calculate the curve coordinates:
                const dx = endPoint.x - startPoint.x,                           // Delta x
                    dy = endPoint.y - startPoint.y,                             // Delta y
                    linkLength = Math.sqrt(dx * dx + dy * dy),                  // Link length in pixels  
                    arcRadius = linkLength * dims.link.returnLink.arcRadius;    // Radius of the the curve, expressed as a proportion of the length

                const curveLinePath = `M${startPoint.x}, ${startPoint.y}  A ${arcRadius} ${arcRadius} 0 0 1 ${endPoint.x}, ${endPoint.y}`,
                    taperedCurvePath = svgPath.taperedArcLink(startPoint.x , startPoint.y, endPoint.x, endPoint.y, arcRadius, this.scale.link.taperScale(repeatedLinkCount), this.scale.link.taperEnd)  

                // Assign SVG path
                link.state.path = networkLinkStyle === 'tapered' ? taperedCurvePath : curveLinePath 

            // c. Regular 'intermediate-network' link: as a straight line
            } else {    
                // i. Calculate SVG path for options
                const taperedPath = svgPath.taperedStraightLink(startPoint.x , startPoint.y, endPoint.x, endPoint.y,  this.scale.link.taperScale(repeatedLinkCount), this.scale.link.taperEnd),
                    linePath    = `M${startPoint.x}, ${startPoint.y}  L${endPoint.x}, ${endPoint.y}` 

                // Assign SVG path
                link.state.path =  networkLinkStyle === 'tapered' ? taperedPath : linePath

                // Check how many links have the same to and from
                link.state.pathWeight   = networkLinkStyle === 'tapered' ? null : repeatedLinkCount * 1.5
            }

        /**
         *  2. SOURCE OUT and SINK IN links: Stemmed Bezier links
         */ 
        } else { 
            const linkGenerator = d3.linkVertical()
                .source(d => Object.values(d.source))
                .target(d => Object.values(d.target))

            const startStem = (() => { 
                // i. Offset straight stem for source nodes
                if(fromNode.state.config.isSource){ 
                    return {
                        x: fromNode.state.node.position.center.x,   
                        y: chartMajorLength * dims.link.source.stemStart
                    }
                }

                if(fromNode.state.config.isIntermediate){
                    // ii. Intermediate-source to sink
                    if(fromNode.state.config.intermediate.isSource){
                        return {
                            x: fromNode.state.node.position.center.x,   
                            y: chartMajorLength * dims.link.intermediate.source.stemStart
                        }
                    }

                    // iii. Intermediate-sink to sink
                    if(fromNode.state.config.intermediate.isSink){
                        return {
                            x: fromNode.state.node.position.center.x,   
                            y: chartMajorLength * dims.link.intermediate.sink.stemStart
                        }
                    }

                    // iv. Intermediate-unconnected to sink
                    if(fromNode.state.config.intermediate.isUnconnected){
                        return {
                            x: fromNode.state.node.position.center.x,   
                            y: chartMajorLength * dims.link.intermediate.unconnected.stemStart
                        }
                    }

                    // v. Intermediate-intermediate to sink is the only link type that needs a stem
                    if(fromNode.state.config.intermediate.isIntermediate){                        
                        if(toNode.state.config.isSink){
                            return { 
                                x: fromNode.state.node.position.center.x,   
                                y: chartMajorLength * dims.link.intermediate.intermediate.stemStart
                            }
                        }
                    }
                }
            })()


            const endStem = (() => { 
                // a. End stem for source nodes: expected to be aligned with intermediate.source node position (see layout config)
                if(fromNode.state.config.isSource){
                    return {
                        x: toNode.state.node.position.center.x,     
                        y: chartMajorLength * dims.link.source.stemEnd
                    }
                }

                // b. End stem for intermediate nodes > sink: all expected to be the same
                if(fromNode.state.config.isIntermediate){
                    // i. Intermediate-source to sink
                    if(fromNode.state.config.intermediate.isSource){
                        return {
                            x: toNode.state.node.position.center.x,   
                            y: chartMajorLength * dims.link.intermediate.source.stemEnd
                        }
                    }

                    // ii. Intermediate-sink to sink
                    if(fromNode.state.config.intermediate.isSink){
                        return {
                            x: toNode.state.node.position.center.x,   
                            y: chartMajorLength * dims.link.intermediate.sink.stemEnd
                        }
                    }
                    // iii. Intermediate-unconnected to sink
                    if(fromNode.state.config.intermediate.isUnconnected){
                        return {
                            x: toNode.state.node.position.center.x,   
                            y: chartMajorLength * dims.link.intermediate.unconnected.stemEnd
                        }
                    }

                    // iv. Intermediate-intermediates to sink
                    if(fromNode.state.config.intermediate.isIntermediate){
                        if(toNode.state.config.isSink){
                            return {
                                x: toNode.state.node.position.center.x,   
                                y: chartMajorLength * dims.link.intermediate.intermediate.stemEnd
                            }
                        }
                    }
                }
            })()

            // c. Add SVG path 
            link.state.path = startStem && endStem && !link.config.isLoop ? `M${startPoint.x}, ${startPoint.y}  L${startStem.x}, ${startStem.y}  ${linkGenerator({ source: startStem, target: endStem })}  L${endPoint.x}, ${endPoint.y}` : ''
        }


        // 3. Check and note major axis direction
        const nodeFromMajor = link.node.from.state.node.position.center.y, 
            nodeFromMinor = link.node.from.state.node.position.center.x,
            nodeToMajor = link.node.to.state.node.position.center.y, 
            nodeToMinor = link.node.to.state.node.position.center.x


        link.config.direction = {
            major: nodeFromMajor === nodeToMajor ? 'neutral' : nodeFromMajor < nodeToMajor ? 'forward' : 'backward',
            minor: nodeFromMinor === nodeToMinor ? 'neutral' : nodeFromMinor > nodeToMinor ? 'forward' : 'backward'
        }
    }
}