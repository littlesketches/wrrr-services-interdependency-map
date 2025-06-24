///////////////////////////////////////////////////////////////
///  GET DATA FOR VISUALISATION                             ///
/// ------------------------------------------------------  ///
/// - Get data for all years                                ///
///////////////////////////////////////////////////////////////


// 1. Enumerate list of reporting data (filtered by available)
const reportingYearData = {
    2024:   typeof data2024 !== 'undefined' ? data2024 : undefined,
    2025:   typeof data2025 !== 'undefined' ? data2025 : undefined,
    2026:   typeof data2026 !== 'undefined' ? data2026 : undefined,
    2027:   typeof data2026 !== 'undefined' ? data2027 : undefined,
    2028:   typeof data2026 !== 'undefined' ? data2028 : undefined,
    2029:   typeof data2026 !== 'undefined' ? data2029 : undefined,
    2030:   typeof data2026 !== 'undefined' ? data2030 : undefined,
}

// 2. Get array of reporting years
const reportingYears = Object.entries(reportingYearData)
    .filter( ([reportYear, d]) => d)
    .map( d => +d[0])

// 3. Init visData Object and add data for each reporting year
const visData = {}

for( const reportYear of reportingYears){
    const data = reportingYearData[reportYear]
    visData[reportYear] = buildVisDataModel(data, reportingYears)
}


// 4. Init app  with the latest year as default
const latestReportYear = reportingYears[reportingYears.length -1]

initApp(latestReportYear)

// Debug: log to console
console.log({data: visData, layout, ui, node, link, schema})

///////////////////////////////////////////////////////////////
/// I. INSTANTIATE "APP"                                    ///
/// ------------------------------------------------------  ///
/// -  "node, link and schema" data are used                ///
///    to create "Layout" instance                          ///
/// - 'layout' works out custom node placements and adds:   ///  
///   - coordinates to the node instances (i.e. to the node ///
///     data) that can be thou of as groupings/clustering   ///
///   - 'path' information to the link instances to render  ///
///     links between nodes (added to the link data)        ///
///   - meta information used for classification, styling   ///
///     and interactivity of nodes and links                ///
/// - 'ui' adds all custom UI elements and handler methods  ///  
/// - 'renderVis' contains all rendering (d3) methods       ///
///////////////////////////////////////////////////////////////


function initApp(reportYear){

    const { node, link, schema, meta } = visData[reportYear] 
    const layout = new Layout( node, link, schema )
    const ui = new Interface(layout, reportingYears)

    // Call renderVis
    renderVis(layout, ui, node, link, schema)

    // Make all app variables available on window (to support re-rendering)
    window.node = node
    window.link = link
    window.layout = layout
    window.ui = ui
    window.schema = schema
    window.meta = meta
}


///////////////////////////////////////////////////////////////
/// II. DATA VISUALISATION RENDERING SCRIPT                 ///
/// ------------------------------------------------------  ///
/// - Uses vanilla D3.js for DOM manipulation               ///
///////////////////////////////////////////////////////////////

function renderVis(layout, ui, node, link, schema){

    // Clear SVG for re-rendering
    d3.select('#vis').selectAll("*").remove()

    // Reference variables
    const dims    = layout.config.dims,
        nodeData  = layout.render.nodeData, 
        linkData  = layout.render.linkData 

    // 1. Select the SVG element and add viewbox prop
    const svg = d3.select('#vis')
        .attr('viewBox', `0, 0, ${dims.width}, ${dims.height}`)
        .on('click', ui.handle.svgClick)

    const defs = svg.append('defs')

    // 2. Add a 'chart' group to draw the visualisation: this is the canvas dimensions minus the margins one each side
    const chart = svg.append('g')
        .attr('id', 'chart')
        .attr('transform', `translate(${dims.margin.left},${dims.margin.left})`)
        .attr('clip-path', 'url(#zoom-clip)')
        .call(d3.zoom().scaleExtent([1, 10])
                .translateExtent([[0, 0], [layout.config.dims.chart.width, layout.config.dims.chart.height]])
                .on('zoom', ui.handle.zoom)
        )       
        .on("dblclick.zoom", null)


    /**
     *  PART I. ADD LAYOUT SECTIONS / GROUPS
     *  - These groups are akin to 'layers' in graphics software and can be thought of as layers for rendering on
     *  - "Child" layers are added in the order that we want visual layers to appear
     *  - At the highest level, there are groups for 'links', 'nodes' and 'annotation' that are setup in that order. This is because we want to paint nodes 'over' links, and any annotation to appear 'over' both 
     */

    // 1. Append SVG section backgrounds/outlines
    const sections          = chart.append('g').attr('id', 'section-area-group'),
        sectionBackground   = sections.append('g').attr('id', 'section-backgrounds'),
        guidelineBg         = sectionBackground.append('g').attr('id', 'section-backgrounds'),
        sourceNodesBg       = sectionBackground.append('g').attr('id', 'source-nodes-backgrounds').attr('class', 'section-background'),
        sinkNodesBGg        = sectionBackground.append('g').attr('id', 'sink-nodes-backgrounds').attr('class', 'section-background'),
        intermediateNodesBg = sectionBackground.append('g').attr('id', 'intermediate-nodes-backgrounds').attr('class', 'section-background')

    // 2. Append SVG groups for link > link groups 
    const links             = chart.append('g').attr('id', 'all-links-group'),
        sourceLinkGroup     = links.append('g').attr('id', 'source-links-out').attr('class', 'link-category-group'),
        sinkLinkGroup       = links.append('g').attr('id', 'sink-links-out').attr('class', 'link-category-group'),
        intermediateLinkGroup = links.append('g').attr('id', 'intermediate-links-out').attr('class', 'link-category-group'),
        intermediateLink = {   // For intermediate nodes, create an object to store SVG sub-groupings  
            source:         intermediateLinkGroup.append('g').attr('id', 'intermediate-source-links'),
            unconnected: {
                sideA:      intermediateLinkGroup.append('g').attr('id', 'intermediate-unconnected-links-side-A'),
                sideB:      intermediateLinkGroup.append('g').attr('id', 'intermediate-unconnected-links-side-B')
            },
            intermediate:   intermediateLinkGroup.append('g').attr('id', 'intermediate-intermediate-links'),
            sink:           intermediateLinkGroup.append('g').attr('id', 'intermediate-sink-links')
        } 

    // 3. Append SVG groups for node > node groups:  
    const nodes             = chart.append('g').attr('id', 'all-nodes-group'),
        sourceNodeGroup     = nodes.append('g').attr('id', 'source-nodes').attr('class', 'node-category-group source'),
        sinkNodeGroup       = nodes.append('g').attr('id', 'sink-nodes').attr('class', 'node-category-group sink'),
        intermediateNodeGroup = nodes.append('g').attr('id', 'intermediate-nodes').attr('class', 'node-category-group intermediate'),
        intermediateNode = {   // For intermediate nodes, create an object to store SVG sub-groupings  
            source:         intermediateNodeGroup.append('g').attr('id', 'intermediate-source-nodes'),
            unconnected: {
                sideA:      intermediateNodeGroup.append('g').attr('id', 'intermediate-unconnected-nodes-side-A'),
                sideB:      intermediateNodeGroup.append('g').attr('id', 'intermediate-unconnected-nodes-side-B')
            },
            intermediate:   intermediateNodeGroup.append('g').attr('id', 'intermediate-intermediate-nodes'),
            sink:           intermediateNodeGroup.append('g').attr('id', 'intermediate-sink-nodes')
        } 
    
    // 4. Append SVG groups for link > link groups 
    const annotation        = chart.append('g').attr('id', 'annotation-group'),
        linkAnnotation      = annotation.append('g').attr('id', 'link-annotation-group'),
        nodeAnnotation      = annotation.append('g').attr('id', 'node-annotation-group')

    /**
     *  PART II. RENDERING HELPER METHODS 
     *  - Helper methods that can be shared between nodes/links: these are used to 'clean up' the rendering methods for nodes and links and make them (slightly) more readable
     */

    const render = {
        node: {
            addBackground: (selection) => {
                selection
                    .attr('id', d => `nodeArea_${d.id}`)                    // Add id
                    .attr('class',  d => `node-bg`)                         // Add a CSS classes 
                    .attr('width',  d => d.state.node.size.width)            // Width calculated in Layout for each node
                    .attr('height', d => d.state.node.size.height)          // Height calculated in Layout for each node
                    .attr('x', d => - d.state.node.size.width * 0.5)        // The rect is offset back by half its width to centre it node position as rects are positioned from 'top left'
                    .attr('y', d => - d.state.node.size.height * 0.5)       // The rect is offset back by half its height to centre in node position as rects are positioned from 'top left'
                    // Add node interactivity handlers
                    .on("mouseover", (ev, node) => ui.handle.nodeIn(ev, node))     // Node interactivity method: mouseover => see interaction.js
                    .on("mouseout", (ev, node) => ui.handle.nodeOut(ev, node))     // Node interactivity method: mouseout  => see interaction.js
                    .on("click", (ev, node) => ui.handle.nodeClick(ev, node))      // Node interactivity method: click     => see interaction.js
            },
            addCircleBackground: (selection) => {
                selection
                    .attr('id', d => `nodeArea_${d.id}`)                    // Add id
                    .attr('class',  d => `node-bg`)                         // Add a CSS classes 
                    .attr('r',  render.node.intermediateRadius)            // Width calculated in Layout for each node                // Add node interactivity handlers
                    .on("mouseover", (ev, node) => ui.handle.nodeIn(ev, node))     // Node interactivity method: mouseover => see interaction.js
                    .on("mouseout", (ev, node) => ui.handle.nodeOut(ev, node))     // Node interactivity method: mouseout  => see interaction.js
                    .on("click", (ev, node) => ui.handle.nodeClick(ev, node))      // Node interactivity method: click     => see interaction.js
            },
            position:  d => `translate(${d.state.node.position.center.x}, ${d.state.node.position.center.y})`,
            intermediateRadius:  d => {
                // Add node radius scaled to inOut degree
                const inOutDegree = Object.values(d.link.in).length + Object.values(d.link.out).length,
                    nodeScale     = layout.scale.node.intermediate.responsibleEntity.inOutDegree,
                    nodeRadius    =  nodeScale(inOutDegree)

                // Add node radius to node data (note: could add this calc to the Node)
                d.state.node.size.radius.outer = nodeRadius

                // => Return node radius
                return nodeRadius
            },
            addLoops: (d, i) => { 
                const node = d.node.from,
                    inOutDegree = Object.values(node.link.in).length + Object.values(node.link.out).length,
                    nodeRadius  = layout.scale.node.intermediate.responsibleEntity.inOutDegree(inOutDegree),         // Responsible entity inOut degree is chosen here [to be refactored as an option]
                    noLoops     = Object.values(node.link.loop).length

                // Create a scale for the loop "rings"
                const loopScale = d3.scaleLinear()
                    .domain([0, noLoops + 0.5])           // From loop i = 0, to "noLoops": because the max i === noLoops -1, this ensures that does not reach the node radius (boundary)
                    .range([nodeRadius * layout.config.dims.node.detail.loop.innerRadius,       // Set in Layout.config => sets size of smallest loop, relative to nodeRadius
                            nodeRadius * layout.config.dims.node.detail.loop.outerRadius ])     // Set in Layout.config => expected to always be 1

                // Calculate loop radius
                const loopRadius = loopScale(i)     // index ('loop count') is scaled in size

                // => Return loopRadius
                return loopRadius
            },
            intermediateFailureIcon: (d) => {
                // For REs that have identified other entities as a failure point

                const radius = layout.config.dims.node.detail.loop.innerRadius * render.node.intermediateRadius(d),
                    strokeWidth = radius / 30
                    suppliers = Object.values(d.state.config.singleFailurePoint.in),
                    customers = Object.values(d.state.config.singleFailurePoint.out)

                // Create SVG path with triangle shape: allows for two 
                let path = ''
                suppliers.forEach( (d, i) => {
                    const r = radius - ( i * 10 *  strokeWidth ) 
                    path = `${path}  ${svgPath.triangle(0, 0, r, 'up' )}`
                })

                customers.forEach( (d, i) => {
                    const r = radius - ( i * 15 *  strokeWidth ) 
                    path = `${path} ${svgPath.triangle(0, 0, r, 'down' )}`
                })

                // => Return SVG path
                return path
            },
            sourceFailureIcon: (d) => {
                // Get width (scaled to degree) and calculate offest
                const nodeWidth = d.state.node.size.width * layout.scale.node.sourceAndSink(d.data.count.link.out.degree)
                const offset = d.state.node.size.height * 0.5 + nodeWidth * 0.5
                // Return SVG path
                return svgPath.triangle(0, offset, nodeWidth * 0.5, 'down' )
            },
            sinkFailureIcon: (d) => {
                // Get width (scaled to degree) and calculate offset
                const nodeWidth = d.state.node.size.width * layout.scale.node.sourceAndSink(d.data.count.link.in.degree)
                const offset = - d.state.node.size.height * 0.5 - nodeWidth * 0.5
                // Return SVG path
                return svgPath.triangle(0, offset, nodeWidth * 0.5, 'up' )
            },
            ewsArc:   ([id, d], i)  => {
                // Get arc inputs
                const noEWS         = Object.values(schema['essential-wrrr-services']).length,
                    nodeRadius      = d.node.state.node.size.radius.outer,
                    startAngle      = (2 * Math.PI / noEWS) * i,             
                    endAngle        = (2 * Math.PI / noEWS) * (i + 1),
                    strokeWidth     = d.node.state.node.size.radius.outer / 20      // Stroke width set relative to the arc outer radius

                // => Return calculated arc path
                const arc =  d3.arc()({
                    innerRadius:    nodeRadius + strokeWidth,   // Ensures arc doesn't overlap
                    outerRadius:    (nodeRadius + strokeWidth) * layout.config.dims.node.detail.ewsSize,
                    startAngle,
                    endAngle  
                })

                // => Return calculated arc path
                return arc
            },
            addClass: (selection) => {
                selection
                    .classed('single-failure-point', node => Object.values(node.state.config.singleFailurePoint.out).length + Object.values(node.state.config.singleFailurePoint.in).length > 0)
                    .classed('single-failure-point-customer', node => Object.values(node.state.config.singleFailurePoint.in).length > 0)
                    .classed('single-failure-point-supplier', node => Object.values(node.state.config.singleFailurePoint.out).length > 0)
                    .classed('failure-resilient', node => Object.values(node.state.config.resilient.out).length + Object.values(node.state.config.resilient.in).length > 0)
                    .classed('specialised', node => Object.values(node.state.config.specialised.out).length > 0)
                    .attr('class', (node, i, d) => {
                        const serviceList = node.state.config.service.assigned
                            .filter(d => d !== 'not-provided')
                            .map(d => `service_${d}`)

                        const serviceClass = serviceList.length === 0 ? 'noServicesIdentified' :  `servicesIdentified ${serviceList.join(' ')}`

                        return `${d[i].getAttribute('class')} ${serviceClass}`
                    })
            }
        },
        link: {
            path: d => d.state.path,
            addClass: (selection) => {
                selection
                    .classed('tapered', link => !link.node.from.state.config.isSource && !link.node.to.state.config.isSink  && !link.config.isLoop && layout.config.option.link.network === 'tapered')
                    .classed('single-failure-point', link => link.config.singleFailurePoint === 'yes')
                    .classed('failure-resilient', link => link.config.failureResilient === 'yes')
                    .classed('specialised', link => link.config.fromSpecial === 'yes')
                    .attr('class', (link, i, d) => `${d[i].getAttribute('class')} frequency_${link.config.frequency} major-direction_${link.config.direction.major} minor-direction_${link.config.direction.minor}`)
            },
            raise: (selection) => {
                if(selection.node()) d3.select(selection.node().parentNode).raise()
            }
        },
        annotation:{
            position:  d => `translate(${d.state.node.position.center.x}, ${d.state.node.position.center.y})`,

            addSourceLabel: (selection) => {
                const labelHeight = 12,
                    labelWidth = 60

                selection.append('rect')
                    .classed('label-bg source', true)
                    .attr('id', d => `node-label-bg_${d.id}`)                 
                    .attr('class',  d => `label-bg`)                         
                    .attr('width',  labelWidth)            
                    .attr('height', labelHeight)          
                    .attr('x', -labelWidth * 0.5)        
                    .attr('y', d =>  - labelHeight * 0.5 + d.state.node.size.height)

                selection.append('text')
                    .classed('node-label-text source', true)
                    .attr('id', d => `node-label_${d.id}`)                   
                    .attr('y', d =>   d.state.node.size.height)  
                    .text(d =>  incognitoMode ? d.meta['label-incognito'] : d.meta.label)
            },

            addSinkLabel: (selection) => {
                const labelHeight = 12,
                    labelWidth = 60

                selection.append('rect')
                    .classed('label-bg sink', true)
                    .attr('id', d => `node-label-bg_${d.id}`)                 
                    .attr('class',  d => `label-bg`)                         
                    .attr('width',  labelWidth)            
                    .attr('height', labelHeight)          
                    .attr('x', -labelWidth * 0.5)        
                    .attr('y', d =>  - labelHeight * 0.5 - d.state.node.size.height)

                selection.append('text')
                    .classed('node-label-text sink', true)
                    .attr('id', d => `node-label_${d.id}`)                   
                    .attr('y', d =>  - labelHeight * 0 - d.state.node.size.height)  
                    .text(d =>  incognitoMode ? d.meta['label-incognito'] : d.meta.label)
            },

            addIntermediateLabel: (selection) => {
                selection.append('rect')
                    .classed('label-bg intermediate', true)
                    .attr('id', d => `node-label-bg_${d.id}`)                 
                    .attr('class',  d => `label-bg`)                                               
                    .attr('width',  d => d.meta.label.length * d.state.node.size.radius.outer * 0.35 * 2 )            
                    .attr('height', d => d.state.node.size.radius.outer * 1.5)                     
                    .attr('x', d => -d.meta.label.length * d.state.node.size.radius.outer * 0.35 * 1)         
                    .attr('y', d => -d.state.node.size.radius.outer * 0.75)   

                selection.append('text')
                    .classed('node-label-text intermediate', true)
                    .attr('id', d => `node-label_${d.id}`)                   
                    .style('font-size', d => d.state.node.size.radius.outer * 1.25)                 
                    .style('stroke-width', d => d.state.node.size.radius.outer * 0.01)                 
                    .text(d =>  incognitoMode ? d.meta['label-incognito'] : d.meta.label)
            },

            addIntermediateLabelAll: (selection) => {
                selection.append('rect')
                    .classed('label-bg intermediate', true)
                    .attr('id', d => `node-label-all-bg_${d.id}`)                 
                    .attr('class',  d => `label-bg`)                                               
                    .attr('width',  d => d.meta.label.length * d.state.node.size.radius.outer * 0.15 * 2 )            
                    .attr('height', d => d.state.node.size.radius.outer * 1)                     
                    .attr('x', d => -d.meta.label.length * d.state.node.size.radius.outer * 0.15 * 1)         
                    .attr('y', d => -d.state.node.size.radius.outer * 0.5)   

                selection.append('text')
                    .classed('node-label-text intermediate', true)
                    .attr('id', d => `node-label-all_${d.id}`)                   
                    .style('font-size', d => d.state.node.size.radius.outer * 0.75)                 
                    .style('stroke-width', d => d.state.node.size.radius.outer * 0.01)                 
                    .text(d =>  incognitoMode ? d.meta['label-incognito'] : d.meta.label)
            }

        }
    }

    /**
     *  PART III. RENDER NODES 
     *  - Positioned and styled individually from node data (where each node is an "entity" class where layout data has been computed)
     *  - Note: 
     *      - Entities are grouped into categories of "SOURCE", "SINK" and "INTERMEDIATE" which is the first factor of determining node positioning/grouping
     *      - Intermediate nodes are broken down into similar sub categories for further placement (particularly intermediate nodes which include the Responsible Entities)
     *      - The general ideas is to introduce a 'flow' from 'source > intermediate > sink". This naturally centers Responsible Entity nodes as they are most connected, while reducing link 'crossover' 
     */ 

    /// 1. "SOURCE" NODES: "supplier only" positioned at 'start of supply chain (i.e. upstream)' 

    // a. Add 'groups' for each source node: 
    const sourceNode = sourceNodeGroup.selectAll('g')       // Added as a child of the sourceNodeGroup
        .data(nodeData.source)                              // Node data is bound to the 'node-group': this data is bound and available to all child nodes 
        .join('g')                                          // Specifies that an SVG 'group' <g> element is added
        .attr('id', d => `node_${d.id}`)                    // Add a id (for individual element referencing)
        .attr('class', `node-group source`)                 // Add a CSS classes (used for styling) 
        .attr('transform',  render.node.position)           // Node positioning is done at the group level via the translate prop 
            .append('g')
            .classed('node-transform-group source', true)
            .call(render.node.addClass)  

    // b. Add node marker elements for each Source node: marker elements are children to the node-group
        // i. Source node background/target area
        const sourceNodeBG = sourceNode.append('rect')      // Added as the first/only child to the node group as a rectangle. This 'background' will be transparent and marks out the total space/area for the node in the layout. It will also  act as a 'target area' for mouse interaction 
            .call(render.node.addBackground)                 // Call method to add node "background" with interaction handlers i.e. interaction target area
            .classed('source', true)                // Add a CSS classes 

        // ii. Rectangle-shaped node marker
        sourceNode.append('rect')                                   // Added as the first/only child to the node group as a rectangle. This 'background' will be transparent and marks out the total space/area for the node in the layout. It will also  act as a 'target area' for mouse interaction 
            .attr('id', d => `node-rect_${d.id}`)                        // Add id
            .attr('class', d => `node source`)                      // Add a CSS classes 
            .attr('width', d =>  d.state.node.size.width * layout.scale.node.sourceAndSink(d.data.count.link.out.degree))      // Width scaled to node out degree
            .attr('height', d => d.state.node.size.height)          // Height calculated in Layout for each node
            .attr('x', d => - d.state.node.size.width * layout.scale.node.sourceAndSink(d.data.count.link.out.degree) * 0.5)       // The rect is offset back by half its width to centre it node position as rects are positioned from 'top left'
            .attr('y', d => - d.state.node.size.height * 0.5)       // The rect is offset back by half its height to centre in node position as rects are positioned from 'top left'

        // ii. Services stripes
        const sourceNodeServices = sourceNode
            .append('g')
            .attr('class', 'services-group')

        sourceNodeServices.selectAll('path.service-stripe')
            .data(d =>  d.state.config.service.assigned.filter(d => d !== 'not-provided') )
            .join('path')
            .attr('class', d => `${d} service-stripe detail source`)
            .attr('d', (d, i, el) => {
                const node  = el[0].parentNode.__data__,
                    nodeSize    = layout.node.layout.source.nodeSize 
                    width       = nodeSize * layout.scale.node.sourceAndSink(node.data.count.link.out.degree),
                    scaled      = (layout.scale.node.source.service.indexOf(d) * 2 + 1) / (layout.scale.node.source.service.length * 2)
                    nodeHeight  = nodeSize * layout.config.dims.node.source.majorRatio,
                    offset      = - nodeHeight * 0.5

                // Return SVG Stripe
                return `m${-width * 0.5} ${offset + scaled * nodeHeight } h${width}`
            })
            .style('stroke-width', (d, i, el) => {
                const nodeSize  = layout.node.layout.source.nodeSize 
                    nodeHeight  = nodeSize * layout.config.dims.node.source.majorRatio,
                    strokeWidth = nodeHeight /(layout.scale.node.source.service.length * 2)

                // Return SVG Stripe
                return strokeWidth
            })


    //// 2. "SINK" NODES: "customer only" positioned at 'end of supply chain (i.e. downstream)'

    // a. Add 'groups' for each sink node
    const sinkNode = sinkNodeGroup.selectAll('g')           // Added as a child of the sinkNodeGroup
        .data(nodeData.sink)                                // Node data is bound to the 'node-group': this data is bound and available to all child nodes 
        .join('g')                                          // Specifies that an SVG 'group' <g> element is added
        .attr('id', d => `node_${d.id}`)                    // Add a id (for individual element referencing)
        .attr('class', `node-group sink`)                   // Add a CSS classes (used for styling) 
        .attr('transform',  render.node.position)           // Node positioning is done at the group level via the translate prop 
            .append('g')
            .classed('node-transform-group sink', true)
            .call(render.node.addClass)  

    // b. Add marker elements for each sink node
        // i. Sink node  background/target area        
        const sinkNodeBG  = sinkNode.append('rect')         // Added as the first/only child to the node group as a rectangle
            .classed('source node-bg', true)                        // Add a CSS classes 
            .call(render.node.addBackground)                // Call method to add node "background" with interaction handlers i.e. interaction target area

        // ii. Rectangle-shaped node marker
        sinkNode.append('rect')                  
            .attr('id', d => `node-rect_${d.id}`)                        
            .attr('class', d => `node sink`)                       
            .attr('width', d => d.state.node.size.width * 0.5)
            .attr('width', d =>  d.state.node.size.width * layout.scale.node.sourceAndSink(d.data.count.link.in.degree))     // Width scaled to node in degree
            .attr('height', d => d.state.node.size.height)              
            .attr('x', d => - d.state.node.size.width * layout.scale.node.sourceAndSink(d.data.count.link.in.degree) * 0.5)            
            .attr('y', d => - d.state.node.size.height * 0.5)  
            .call(render.node.addClass)         

        // iii. Services stripes
        const sinkNodeServices = sinkNode
            .append('g')
            .attr('class', 'services-group')

        sinkNodeServices.selectAll('path.service-stripe')
            .data(d =>  d.state.config.service.assigned.filter(d => d !== 'not-provided') )
            .join('path')
            .classed('service-stripe detail sink', true)
            .attr('d', (d, i, el) => {
                const node  = el[0].parentNode.__data__,
                    nodeSize    = layout.node.layout.sink.nodeSize 
                    width       = nodeSize * layout.scale.node.sourceAndSink(node.data.count.link.in.degree),
                    scaled      = (layout.scale.node.sink.service.indexOf(d) * 2) / (layout.scale.node.sink.service.length * 2 + 2)
                    nodeHeight  = nodeSize * layout.config.dims.node.sink.majorRatio,
                    offset      = - nodeHeight * 0.5

                // Return SVG Stripe
                return `m${-width * 0.5} ${offset + scaled * nodeHeight } h${width}`
            })
            .style('stroke-width', (d, i, el) => {
                const nodeSize  = layout.node.layout.sink.nodeSize 
                    nodeHeight  = nodeSize * layout.config.dims.node.sink.majorRatio,
                    strokeWidth = nodeHeight /(layout.scale.node.sink.service.length * 2)

                // Return SVG Stripe
                return strokeWidth
            })


    //// 3. INTERMEDIATE NODES: "INTERMEDIATE NETWORK"
    /*   - Intermediate nodes have a sub-layout where intermediate nodes are grouped into 
     *      - 'unconnected' to other intermediate nodes: these are positioned 'off to the sides'
     *      - further (similar) categories of 'source', 'sink' and 'intermediate', depending on their connections to other intermediate nodes
     */ 

        // a. INTERMEDIATE "UNCONNECTED" INTERMEDIATE NODES: Positioned as two equal groups on the sides to be 'out of the way' of the central intermediate network
            // i. Add node groups for 'intermediate unconnected' for both sides
            const interUnconnectedNodeSideA = intermediateNode.unconnected.sideA.selectAll('g')
                .data(nodeData.intermediate.unconnected.sideA)
                .join('g')
                .attr('id', d => `node_${d.id}`)
                .attr('class', `intermediate-unconnected node-group side-A`)
                .classed('responsible-entity', d=> d.state.config.isResponsibleEntity)
                .attr('transform',  render.node.position)            // Node positioning is done at the group level via the translate prop         
                .append('g')
                    .classed('node-transform-group', true)
                    .classed('responsible-entity', d => d.state.config.isResponsibleEntity)
                    .call(render.node.addClass)  

            const interUnconnectedNodeSideB =  intermediateNode.unconnected.sideB.selectAll('g')
                .data(nodeData.intermediate.unconnected.sideB)
                .join('g')
                .attr('id', d => `node_${d.id}`)
                .attr('class', `intermediate intermediate-unconnected node-group side-B`)
                .classed('responsible-entity', d=> d.state.config.isResponsibleEntity)
                .attr('transform',  render.node.position)            // Node positioning is done at the group level via the translate prop         
                .append('g')
                    .classed('node-transform-group', true)
                    .classed('responsible-entity', d => d.state.config.isResponsibleEntity)
                    .call(render.node.addClass)  

            // ii. Side A: Add background and markers to node
            // - Add node background/target
            interUnconnectedNodeSideA.append('circle')
                .classed('intermediate', true)                // Add CSS class
                .classed('unconnected', true)                 // Add CSS class
                .call(render.node.addCircleBackground)              // Call method to add node "background" with interaction handlers i.e. interaction target area

            // - Add node outline circle
            interUnconnectedNodeSideA.append('circle')
                .attr('class', d => `node node-circle intermediate unconnected`)
                .attr('r', render.node.intermediateRadius)
                .call(render.node.addClass)         

            // iii. Side B: Add markers
            // - Add node background/target
            interUnconnectedNodeSideB.append('circle')
                .classed('intermediate', true)              // Add a CSS classes 
                .classed('unconnected', true)               // Add a CSS classes 
                .call(render.node.addCircleBackground)            // Call method to add node "background" with interaction handlers i.e. interaction target area

            // - Add node outline circle
            interUnconnectedNodeSideB.append('circle')
                .attr('id', d => `nodeCircle_${d.id}`)
                .attr('class', d => `node node-circle intermediate intermediate-unconnected`)
                .attr('r', render.node.intermediateRadius)


        // b. INTERMEDIATE "SOURCE"  NODES: Positioned upper in the intermediate section
            // i. Add nodes for 'intermediate source'
            const interSourceNode = intermediateNode.source.selectAll('g')
                .data(nodeData.intermediate.source)
                .join('g')
                .attr('id', d => `node_${d.id}`)
                .attr('class', `intermediate intermediate-source node-group`)
                .classed('responsible-entity', d => d.state.config.isResponsibleEntity)
                .attr('transform',  render.node.position)            // Node positioning is done at the group level via the translate prop         
                .append('g')
                    .classed('node-transform-group', true)
                    .classed('responsible-entity', d => d.state.config.isResponsibleEntity)
                    .call(render.node.addClass)  

            // ii. Add node background/target
            interSourceNode.append('circle')
                .classed('intermediate', true)              // Add CSS class
                .classed('intermediate-source', true)       // Add CSS class 
                .call(render.node.addCircleBackground)              // Call method to add node "background" with interaction handlers i.e. interaction target area

            // iii. Add node outline circle
            interSourceNode.append('circle')
                .attr('id', d => `nodeCircle_${d.id}`)
                .attr('class', d => `node node-circle intermediate  intermediate-source`)
                .attr('r', render.node.intermediateRadius)

            // iv. Add Loops for vertically integrated entities
            const interSourceNodeLoopGroup = interSourceNode
                .filter( d => d.state.config.hasLoop)           // Filter to add group only for those that have loops
                .append('g')                                    // Add a group for each node that has internal loops
                .attr('id', d => `nodeLoopGroup_${d.id}`)
                .attr('class', d => 'nodeLoopGroup')

            interSourceNodeLoopGroup.selectAll('circle')        // Add a circle for each 'internal loop'
                .data(d => Object.values(d.link.loop) )
                .join('circle')
                .attr('id', d => `link-loop_${d.id}`)   
                .attr('class', 'link link-loop')        
                .attr('r', render.node.addLoops)
                .style('stroke-width', d => render.node.intermediateRadius(d.node.from) / 30)


        // c. "INTERMEDIATE" INTERMEDIATE NODES: Positioned centrally in the intermediate section
            // i. Add nodes for 'intermediate intermediate' 
            const interIntermediateNode = intermediateNode.intermediate.selectAll('g')
                .data(nodeData.intermediate.intermediate)
                .join('g')      
                .attr('id', d => `node_${d.id}`)                                  
                .attr('class', `intermediate intermediate-intermediate node-group`)
                .classed('responsible-entity', d => d.state.config.isResponsibleEntity )
                .attr('transform',  render.node.position)            // Node positioning is done at the group level via the translate prop         
                .append('g')
                    .classed('node-transform-group intermediate-intermediate', true)
                    .classed('responsible-entity', d => d.state.config.isResponsibleEntity)
                    .call(render.node.addClass)  

            // ii. Node background marker
            interIntermediateNode.append('circle')   
                .classed('intermediate', true)               // Add a CSS classes 
                .classed('intermediate-intermediate', true)  // Add a CSS classes 
                .call(render.node.addCircleBackground)             // Call method to add node "background" with interaction handlers i.e. interaction target area

            // iii. Node circle
            interIntermediateNode.append('circle')
                .attr('id', d => `nodeCircle_${d.id}`)
                .attr('class', d => `node node-circle intermediate unconnected`)
                .attr('r', render.node.intermediateRadius)
                .call(render.node.addClass)     

            // iv. Loops for vertically integrated entities
            const interIntermediateNodeLoopGroup = interIntermediateNode
                .filter( d => d.state.config.hasLoop)           // Filter selection to add group only for those that have loops
                .append('g')
                .attr('id', d => `nodeLoopGroup_${d.id}`)
                .attr('class', d => 'nodeLoopGroup')

            interIntermediateNodeLoopGroup.selectAll('circle')
                .data(d => Object.values(d.link.loop) )
                .attr('id', d => `group_${d.id}`)
                .join('circle')
                .attr('class', 'link link-loop')        
                .attr('r', render.node.addLoops)
                .style('stroke-width', d => render.node.intermediateRadius(d.node.from) / 30)

            // vi. Non-RE services stripes
            const nonReIntermediates = d3.selectAll('.intermediate-intermediate.node-transform-group:not(.responsible-entity)')

            nonReIntermediates.selectAll('path.service-stripe')
                .data(d =>  d.state.config.service.assigned.filter(d => d !== 'not-provided') )
                .join('path')
                .attr('class', d => `${d} service-stripe detail intermediate`)
                .attr('d', (d, i, el) => {
                    const node  = el[0].parentNode.__data__,
                        radius  = render.node.intermediateRadius(node), 
                        scaled  = (layout.scale.node.intermediate.nonResponsibleEntity.service.indexOf(d) * 2) / (layout.scale.node.intermediate.nonResponsibleEntity.service.length * 2 + 2),
                        offset  = - radius,
                        chord   = chordLengthFromProportion(radius, scaled)

                    // Return SVG Stripe
                    return `m${-chord * 0.5} ${offset + scaled * radius * 2 } h${chord}`

                    // Helper
                    function chordLengthFromProportion(r, h) {
                        const d = (h - 0.5) * 2 * r; 
                        if (Math.abs(d) > r) return 0; 
                        return 2 * Math.sqrt(r * r - d * d);
                    }
                })
                .style('stroke-width', (d, i, el) => {
                    const node  = el[0].parentNode.__data__,
                        radius  = render.node.intermediateRadius(node)

                    const nodeSize  = layout.node.layout.source.nodeSize 
                        nodeHeight  = radius * 2 * layout.config.dims.node.source.majorRatio,
                        strokeWidth = radius * 2 /(layout.scale.node.source.service.length * 2)

                    // Return SVG Stripe
                    return strokeWidth
                })


        // d. "SINK" INTERMEDIATE NODES: Positioned lower in the intermediate section
            // i. Add nodes for 'intermediate sink'
            const interSinkNode = intermediateNode.sink.selectAll('g')
                .data(nodeData.intermediate.sink)
                .join('g')
                .attr('id', d => `node_${d.id}`)
                .attr('class', `intermediate intermediate-sink node-group`)
                .classed('responsible-entity', d=> d.state.config.isResponsibleEntity)
                .attr('transform',  render.node.position)     // Node positioning is done at the group level via the translate prop         
                .append('g')
                    .classed('node-transform-group', true)
                    .classed('responsible-entity', d => d.state.config.isResponsibleEntity)
                    .call(render.node.addClass)  

            // ii. Add Node background/target area
            interSinkNode.append('circle')
                .attr('id', d => `node_${d.id}`)
                .classed('intermediate', true)              // Add a CSS classes 
                .classed('intermediate-sink', true)         // Add a CSS classes 
                .call(render.node.addCircleBackground)            // Call method to add node "background" with interaction handlers i.e. interaction target area

            // iii. Add node outline 
            interSinkNode.append('circle')
                .attr('id', d => `nodeCircle_${d.id}`)
                .attr('class', d => `node node-circle intermediate unconnected`)
                .attr('r', render.node.intermediateRadius)
                .call(render.node.addClass)     

            // iv. Add Loops for vertically integrated entities
            const interSinkNodeLoopGroup = interSinkNode
                .filter( d => d.state.config.hasLoop)           // Filter to add group only for those that have loops
                .append('g')                                    // Add a group for each node that has internal loops
                .attr('id', d => `nodeLoopGroup_${d.id}`)
                .attr('class', d => 'nodeLoopGroup')

            interSinkNodeLoopGroup.selectAll('circle')        // Add a circle for each 'internal loop'
                .data(d => Object.values(d.link.loop) )
                .join('circle')
                .attr('id', d => `link-loop_${d.id}`)   
                .attr('class', 'link link-loop')        
                .attr('r', render.node.addLoops)
                .style('stroke-width', d => render.node.intermediateRadius(d.node.from) / 30)


        // e. RESPONSIBLE ENTITY ESSENTIAL WASTE SERVICES
        const responsibleEntityEwsGroup = d3.selectAll('.node-transform-group.responsible-entity')
            .append('g')
            .attr('class', 'ews-group detail')

        responsibleEntityEwsGroup.selectAll('path')
            .data(d => Object.entries(d.data['essential-wrrr-services']))
            .join('path')
            .attr('class', d => `ews-petal ${d[0]}`)
            .style('display', ([id, d]) =>   d.isAssigned ? 'auto' : 'none' )
            .style('stroke-width', ([id, d]) => d.node.state.node.size.radius.outer / 20)
            .attr('d', ([id, d], i) => render.node.ewsArc([id, d], i) )

        // f. FAILURE POINT ICONS
        // Add failure point icon for intermediate nodes
        const intermediateSingleFailurePoints = d3.selectAll('.intermediate.node-group g').filter('.single-failure-point')
            .append('path')
            .classed('single-failure-point intermediate detail', true)
            .attr('d', render.node.intermediateFailureIcon) 
            .style('stroke-width', d =>  render.node.intermediateRadius(d) / 30)

        // Add failure point icon for all source nodes
        const sourceSingleFailurePoints = d3.selectAll('.source.node-group g').filter('.single-failure-point')
            .append('path')
            .classed('single-failure-point source detail', true)
            .attr('d', render.node.sourceFailureIcon) 

        const sinkSingleFailurePoints = d3.selectAll('.sink.node-group g').filter('.single-failure-point')
            .append('path')
            .classed('single-failure-point sink detail', true)
            .attr('d', render.node.sinkFailureIcon) 



    /************************/
    /***  II. ADD LINKS   ***/ 
    /************************/

    /**
     *  1. SOURCE LINKS
     */ 

        // a. Add 'groups' for each source node: this allows for multiple links per group
        const sourceLink = sourceLinkGroup.selectAll('g')
            .data(linkData.source)
            .join('g')
            .attr('id', d => `link_${d.id}`)
            .attr('class', `link-group source`)    

        // Source node link out (
        sourceLink.append('path')
            .attr('class', d => `link from-source`)

    /**
     *  2. INTERMEDIATE LINKS 
     */ 
        // a. Unconnected intermediate Node links 
        const intermediateUnconnectedLinkSideA = intermediateLink.unconnected.sideA.selectAll('g')
            .data(linkData.intermediate.unconnected.sideA)
            .join('g')
            .attr('id', d => `link_${d.id}`)
            .attr('class', `intermediate-unconnected link-group side-A`)

        const intermediateUnconnectedLinkSideB = intermediateLink.unconnected.sideB.selectAll('g')
            .data(linkData.intermediate.unconnected.sideB)
            .join('g')
            .attr('id', d => `link_${d.id}`)
            .attr('class', `intermediate-unconnected link-group side-B`)
        
        // i. Side A link in 
        intermediateUnconnectedLinkSideA.append('path')
            .attr('class', d => `link from-intermediate-unconnected`)

        //  ii. Side B link in 
        intermediateUnconnectedLinkSideB.append('path')
            .attr('class', d => `link from-intermediate-unconnected`)

        // b. Intermediate source links
        const intermediateSourceLink = intermediateLink.source.selectAll('g')
            .data(linkData.intermediate.source)
            .join('g')
            .attr('id', d => `link_${d.id}`)
            .attr('class', `intermediate-source link-group`)
            .classed(`intermediate-network`, d => d.node.to.state.config.isIntermediate)

        intermediateSourceLink.append('path')
            .attr('class', d => `link intermediate-network intermediate-source`)

        // c. Intermediate intermediate links
        const intermediateIntermediateLink = intermediateLink.intermediate.selectAll('g')
            .data(linkData.intermediate.intermediate)
            .join('g')      
            .attr('id', d => `link_${d.id}`)
            .attr('class', `intermediate-intermediate link-group`)
            .classed(`intermediate-network`, d => d.node.to.state.config.isIntermediate  )

        intermediateIntermediateLink.append('path')
            .attr('class', d => `link intermediate-intermediate intermediate-network `)
            .classed('link-return', d => d.config.isReturn)
            .classed(`intermediate-sink`, d =>  d.node.to.state.config?.intermediate?.isSink )

        // d. Intermediate source links
        const intermediateSinkLink = intermediateLink.sink.selectAll('g')
            .data(linkData.intermediate.sink)
            .join('g')
            .attr('id', d => `link_${d.id}`)
            .attr('class', `intermediate-sink link-group`)

        intermediateSinkLink.append('path')
            .attr('class', d => `link from-intermediate-sink`)
            .classed('link-return', d => d.config.isReturn)


    /**
     *  3. ADD PATHS AND ID TO ALL LINKS
     *  - This is done to the selection of all links once they are all setup for convenience and conciseness. 
     *  - This could (more traditionally) be done while appending each type of path
     */ 
        d3.selectAll('.link')
            .attr('id', d => `link-path_${d.id}`)
            .attr('d', render.link.path)
            .call(render.link.addClass)

        d3.selectAll('.link.intermediate-network')
            .style('stroke-width', d => d.state.pathWeight)
            .call(render.link.addClass)

        // Raise 'vulnerability interest' links links are on op or group (for visibility)
        d3.selectAll('.link.intermediate-network.specialised').call(render.link.raise)
        d3.selectAll('.link.intermediate-network.single-failure-point').call(render.link.raise)
        d3.selectAll('.link.intermediate-network.single-failure-point.specialised').call(render.link.raise)    // Ensures any with both types are on top


    /**********************************/
    /*** III. ADD BACKGROUNDS AREAS ***/ 
    /**********************************/

    // i. Add a background to the chart 
    guidelineBg.append('rect')
        .attr('class', 'chart-bg guideline')
        .attr('height', dims.chart.height)
        .attr('width', dims.chart.width)

    // ii. Background for unconnected (intermediate) nodes on "sides"
    intermediateNodesBg.append('rect') 
        .attr('id', `intermediate-unconnected-side-A-bg`)
        .attr('class', 'section-bg intermediate intermediate-unconnected side-A')
        .attr('width',  layout.node.layout.intermediate.dims.unconnected.sideA.length)
        .attr('height', 300)    
        .attr('x', 0)
        .attr('y', layout.config.dims.chart.height * 0.5 - 150)
        .attr('ry', '1%')

    intermediateNodesBg.append('rect') 
        .attr('id', `intermediate-unconnected-side-B-bg`)
        .attr('class', 'section-bg intermediate intermediate-unconnected side-B')
        .attr('width',  layout.node.layout.intermediate.dims.unconnected.sideB.length)
        .attr('height', 300)
        .attr('x', layout.config.dims.chart.width - layout.node.layout.intermediate.dims.unconnected.sideB.length)
        .attr('y', layout.config.dims.chart.height * 0.5 - 150)
        .attr('ry', '1%')

    // iii. Background for intermediate (intermediate) nodes "central"
    intermediateNodesBg.append('rect')
        .attr('id', 'intermediate-intermediate-area-bg')
        .attr('class', 'section-bg intermediate intermediate-intermediate')
        .attr('width', layout.node.layout.intermediate.dims.intermediate.length)
        .attr('height', layout.config.dims.chart.height * (layout.config.dims.nodeCluster.intermediate.sink - layout.config.dims.nodeCluster.intermediate.source) )
        .attr('x', - layout.node.layout.intermediate.dims.intermediate.length * 0.5 + layout.config.dims.chart.width * 0.5)
        .attr('y', layout.config.dims.chart.height * (0.5 - layout.config.dims.nodeCluster.intermediate.source)) 
        .attr('ry', '1%')

    // iv. Background for source (intermediate) nodes "upper"
    intermediateNodesBg.append('rect')
        .attr('id', 'intermediate-source-area-bg')
        .attr('class', 'section-bg intermediate intermediate-source')



    /****************************/
    /***  IV. ADD NODE LABELS ***/ 
    /****************************/

    /**
     *  1. SOURCE LABELS
     */ 

    const sourceLabelGroup = nodeAnnotation
        .append('g')
        .attr('class', `node-labels-group source`)  

    const sourceLabels = sourceLabelGroup.selectAll('g')
        .data(nodeData.source)
        .join('g')
        .attr('id', d => `node-label_${d.id}`)
        .attr('class', `node-label-group source`)    
        .attr('transform',  render.annotation.position)     

    sourceLabels.call(render.annotation.addSourceLabel)  


    /**
     *  2. SINK LABELS
     */ 

    const sinkLabelGroup = nodeAnnotation
        .append('g')
        .attr('class', `node-labels-group sink`)  

    const sinkLabels = sinkLabelGroup.selectAll('g')
        .data(nodeData.sink)
        .join('g')
        .attr('id', d => `node-label_${d.id}`)
        .attr('class', `node-label-group sink`)    
        .attr('transform',  render.annotation.position)     

   sinkLabels.call(render.annotation.addSinkLabel)  

    /**
     *  3. INTERMEDIATE LINKS 
     */ 
    const intermediateLabelGroup = nodeAnnotation
        .append('g')
        .attr('class', `node-labels-group intermediate `)  

    const intermediateLabels = intermediateLabelGroup.selectAll('g')
        .data(Object.values(node).filter(node => node.state.config.isIntermediate))
        .join('g')
        .attr('id', d => `node-label_${d.id}`)
        .attr('class', `node-label-group intermediate`)    
        .attr('transform',  render.annotation.position)   

    intermediateLabels.call(render.annotation.addIntermediateLabel)  

    const intermediateLabelGroupAll = nodeAnnotation
        .append('g')
        .attr('class', `node-labels-group intermediate all`)  

    const intermediateLabelsAll = intermediateLabelGroupAll.selectAll('g')
        .data(Object.values(node).filter(node => node.state.config.isIntermediate))
        .join('g')
        .attr('id', d => `node-label-all_${d.id}`)
        .attr('class', `node-label-group-all intermediate all`)    
        .attr('transform',  render.annotation.position)   

   intermediateLabelsAll.call(render.annotation.addIntermediateLabelAll)  

}