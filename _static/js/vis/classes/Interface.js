/**
 *  CLASS FOR MANAGING USER INTERFACE 
 */

//  => Layout Class
class Interface{
    
    constructor(layout, reportingYears){

        this.layout = layout

        // State 
        this.state = {
            meta: {
                reportingYears,
                reportYear:  reportingYears[reportingYears.length-1]
            }, 
            isShift:            false,          // Shift mode functions

            mode: {
                app:                    'overview',      // 'overview', 'entities', 'service', 'vulnerability', 'detail'
                // 'core' app modes 
                entities: {
                    mode:                 'responsible',       // intro responsible, browse, trace, blend
                    hoverDepthFull:       undefined,        
                    blendOn:              false,
                    responsible:          undefined,
                    responsibleDepthFull: undefined,
                    reIncognito:            undefined,
                },
                service: {
                    mode:               'ews',       // 'ews', 'service', 'frequency'
                    eswSelect:          this.#addESW(),
                    serviceSelect:      this.#addServiceByType(),
                    frequencySelect:    undefined,
                },
                vulnerability: {
                    mode:               'failure-specialised',
                    failure:            false,
                    specialised:        false,
                    internalLoops:      false,
                    returnLoops:        false,
                    feedbackLinks:      false,
                },
                key: {
                    mode:               'node-link',
                }
            },
            selection: {
                node:  {
                    instances: {
                        primary:    [],
                        upstream:   [],
                        downstream: [],
                    },
                    network:    {}      // Store the selected node network
                },      
                link: {
                    instances: {
                        primary:    [],
                        upstream:   [],
                        downstream: [],
                    }
                }       
            },
            active: {
                node: [],
                link: [],            
            },
            view: {
                pane: {
                    info:       true,
                    vis:        true,
                    legend:     true
                },
                guidance:           true,
                infoContent:        true,
                traceContent:       false,
                blendContent:       false,
                networkLabels:      false
            }
        }

        // Add public UI handlers 
        this.handle = this.#addHandlers()

        // Add keyboard I handlers
        this.#addKeyHandler()

        this.#init()
    }


    ///////////////////////////
    ////  PRIVATE METHODS  ////
    ///////////////////////////

    #init(){
        // Add UI components
        this.#addYearSelectUI()
        this.#addEwsUI()
        this.#addServicesUI()
        this.#addFrequencyUI()
        this.#addResponsibleEntityUI()
        this.#addMetaData()

        // Set on load
        this.handle.updateLegend()
        this.handle.setMode()
        this.handle.toggleVisDetails(true)
        this.handle.toggleTips(true)
        this.handle.toggleBrowseDepth(true)

        this.handle.setEntitiesMode()
        this.handle.setServiceMode()
        this.handle.setVulnerabilityMode()

        this.handle.reset()
    }

    /** State option prop setup */
    #addESW() {
        const eswSchema = this.layout._data.schema['essential-wrrr-services'] 
        // Init obj
        const obj = {}

        // Add ESW ids as props set to false
        for(const id of Object.keys(eswSchema)){
            obj[id] = false
        }

        // Add count to 
        d3.selectAll('.no-ews').html(Object.keys(eswSchema).length)

        // => Return obj
        return obj
    }

    #addServiceByType() {

        // Init obj
        const obj = {}

        // Services
        const service = {
            source:         this.layout.scale.node.source.service,
            sink:           this.layout.scale.node.sink.service,
            intermediate:   this.layout.scale.node.intermediate.nonResponsibleEntity.service
        }

        // Add services ids as props set to false
        for(const [type, servicesArray] of Object.entries(service)){
            obj[type] = {}
            if(servicesArray){
                for(const d of servicesArray) obj[type][d] = false
            }
        }

        // => Return obj
        return obj
    }

    // Event handlers: : available publicly via handle prop
    #addHandlers() {
        const app = d3.select('#app-container')
        const ui = this

        // Local variables used for blend/multi selections 
        let selectedNodes = []  

        // Methods
        return {
            // Mouse events
            nodeIn: (ev, node) => {
                ev.stopPropagation()
                const parent = ev.srcElement.parentElement,
                    nodeEl = d3.select(parent),
                    label = d3.select(`#node-label_${node.id}`)

                nodeEl.classed('focus', true) 

                switch(ui.state.mode.app){
                    case 'service': 
                    case 'vulnerability': 
                    case 'detail': 

                        break

                    case 'overview':     // Fall into entities to browse
                        ui.handle.setMode('entities')
                        ui.handle.setEntitiesMode('browse')

                    case 'entities':    
                        switch(ui.state.mode.entities.mode){
                            case 'browse':
                                switch(ui.state.mode.entities.hoverDepthFull){
                                    case true:
                                        // Trace to end of network
                                        let end = false
                                        while(!end) end = ui.handle.visualTrace(node)
                                        break

                                    case false:
                                    default: 
                                        ui.handle.visualTrace(node)
                                }

                            case 'responsible':
                                if(ui.state.mode.entities.reIncognito) return
                                break
                            case 'trace':
                            case 'blend':
                                break
                        }
                        break
                }

                // Show labels
                label.classed('visible', true)
                d3.selectAll('.node-label-group-all').classed('visible', false)

                // Update legend data
                ui.handle.updateLegend()

            },
            nodeOut: (ev, node) => {
                ev.stopPropagation()
                const parent = ev.srcElement.parentElement,
                    nodeEl = d3.select(parent),
                    label = d3.select(`#node-label_${node.id}`)

                nodeEl.classed('focus', false) 
                label.classed('visible', false)
                if(!ui.state.mode.entities.reIncognito) ui.handle.resetLabelSelection()

                switch(ui.state.mode.app){
                    case 'service': 
                    case 'vulnerability': 
                        break

                    case 'overview': 
                    case 'entities': 
         
                        switch(ui.state.mode.entities.mode){
                            case 'responsible':
                                if(ui.state.mode.entities.reIncognito) return
                                break
                            case 'browse':
                                ui.handle.reset()
                                break
                        }
                        break
                }

                // Update legend data
                ui.handle.updateLegend()
                ui.handle.resetLabelSelection()

            },
            nodeClick: (ev, node) => {
                // Stop event propagation
                 ev.stopPropagation()

                // Variables
                const parent = ev.srcElement.parentElement,
                    nodeEl = d3.select(parent).selectAll('.node')

                // Action by mode / submode
                switch(ui.state.mode.app){
                    case 'service': 
                        break

                    case 'vulnerability': 
                        break

                    case 'overview':    // Will be in entities mode already
                        ui.handle.setMode('entities')
                    case 'entities': 
                        switch(ui.state.mode.entities.mode){
                            case 'responsible':
                                if(ui.state.mode.entities.reIncognito) return
                                break

                            case 'browse':
                                ui.handle.reset()
                                // Select/start trance  and enter trance mode
                                ui.handle.visualTrace(node)
                                ui.handle.updateTraceUI()

                                selectedNodes = [...new Set([...selectedNodes, node])]
                                ui.handle.setEntitiesMode('trace')
                                break 

                            case 'trace':  
                                // Start new trace
                                if(selectedNodes.length === 0){
                                    ui.handle.visualTrace(node)
                                    ui.handle.updateTraceUI()
                                    selectedNodes = [...new Set([...selectedNodes, node])]

                                // Update (deeper) Trace
                                } else if(selectedNodes.length === 1 && selectedNodes.includes(node)){
                                    ui.handle.visualTrace(node)
                                    ui.handle.updateTraceUI()

                                // Reset if new node selection is attempted and start trace
                                } else {
                                    ui.handle.reset()
                                    ui.handle.visualTrace(node)
                                    ui.handle.updateTraceUI()
                                    selectedNodes = [...new Set([...selectedNodes, node])]
                                }

                                break

                            case 'blend':  
                                // Return (no update)if node is reselected
                                if(selectedNodes.includes(node)) return
                                
                                // Update node selection andblend UI 
                                selectedNodes = [...new Set([...selectedNodes, node])]
                                ui.handle.updateBlendUI(selectedNodes)   

                                // Trace selected nodes to end of network
                                ui.handle.visualTraceMulti(selectedNodes)

                            break
                        }

                        break
                }

                // Update legend data
                ui.handle.updateLegend()
                ui.handle.resetLabelSelection()
            },
            svgClick: (ev, node) => {

                // Action by mode / submode
                switch(ui.state.mode.app){
                    case 'service': 
                        break
                    case 'vulnerability': 
                        break
                    case 'overview':   
                        break
                    case 'entities': 
                        switch(ui.state.mode.entities.mode){
                            case 'responsible':
                                if(ui.state.mode.entities.reIncognito) return
                                break
                        }
                        break
                }
                ui.handle.reset()

            },

            // Update data sidebar
            updateLegend: (ev) => {
                /*
                 *  Method to update data shown in the sidebar "legend"
                 *  - Uses 'active' nodes and links stored/updated from node highlighting and selection (i.e. mouse in/out and click)
                 */
                const activeNodes = ui.state.active.node,
                    activeLinks = ui.state.active.link

                /** SOURCES */
                const activeSourceNodes = activeNodes.filter(el => el.classList.contains('source')),
                    activeSourceLinks = activeLinks.filter(el => el.classList.contains('source'))

                const noSources = activeNodes.length === 0 ? ui.layout.node.cluster.byCategory.source.length 
                    : [... new Set(activeSourceNodes)].length 
           
                const noSourceLinks = activeNodes.length === 0 ? ui.layout.render.linkData.source.length   
                    : [... new Set(activeSourceLinks)].length
                 
                const noSourceMultiLinks = activeNodes.length === 0 ? Object.values(ui.layout.node.cluster.byCategory.source).filter( node => Object.values(node.link.out).length > 1).length
                    : [...new Set(activeSourceNodes.filter( el => Object.values(el.__data__.link.out).length > 1)) ].length
                        
                const noSourceSingleLinks = noSourceLinks - noSourceMultiLinks

                d3.select('#data-node-source').html(`x ${noSources}`)
                d3.select('#data-node-source_unit').html(`${noSources === 1 ? 'entity' : 'entities'}`)
                d3.select('#data-node-source-multi-link').html(`x ${noSourceMultiLinks}`)
                d3.select('#data-node-source-multi-link_unit').html(`${noSourceMultiLinks === 1 ? 'entity' : 'entities'}`)
                d3.select('#data-node-source-single-link').html(`x ${noSourceSingleLinks}`)
                d3.select('#data-node-source-single-link_unit').html(`${noSourceSingleLinks === 1 ? 'entity' : 'entities'}`)
                d3.select('#data-link-source').html(`x ${noSourceLinks}`)
                d3.select('#data-link-source_unit').html(`${noSources === 1 ? 'link' : 'links'}`)


                /** INTERMEDIATES */
                const activeIntermediateNodes = ui.state.active.node.filter(el => el.classList.contains('intermediate')),
                    activeIntermediateLinks = ui.state.active.link.filter(el => el.classList.contains('intermediate-network') )

                const noIntermediate = activeNodes.length === 0 ? ui.layout.node.cluster.byCategory.intermediate.length 
                    : [... new Set(activeNodes.filter(el => el.classList.contains('intermediate')))].length

                const noIntermediateREs = activeNodes.length === 0 ? ui.layout.node.cluster.byCategory.responsibleEntity.length 
                    : [...new Set(activeNodes.filter(el => el.classList.contains('responsible-entity')))].length

                const noIntermediateNonREs = activeNodes.length === 0 ? ui.layout.node.cluster.byCategory.intermediate.length - ui.layout.node.cluster.byCategory.responsibleEntity.length
                    : [...new Set(activeNodes.filter(el => el.classList.contains('intermediate')))].length - [...new Set(activeNodes.filter(el => el.classList.contains('responsible-entity')))].length

                const noUnconnected = activeNodes.length === 0 ? ui.layout.node.cluster.intermediateNodes.unconnected.all.length 
                    : [...new Set(activeNodes.filter(el => el.classList.contains('intermediate-unconnected')))].length 

                const noIntermediateSource  = activeNodes.length === 0 ? ui.layout.node.cluster.intermediateNodes.source.length 
                    : [...new Set(activeNodes.filter(el => el.classList.contains('intermediate-source')))].length 

                const noIntermediateSink  = activeNodes.length === 0 ? ui.layout.node.cluster.intermediateNodes.sink.length
                    : [...new Set(activeNodes.filter(el => el.classList.contains('intermediate-sink')))].length 

                const noIntermediateIntermediate = noIntermediate - noUnconnected - noIntermediateSource - noIntermediateSink

                const noIntermediateLinks = activeNodes.length === 0 ? Object.values(ui.layout._data.link).filter(link => link.node.from.state.config.isIntermediate && link.node.to.state.config.isIntermediate ).length
                    : [...new Set(activeIntermediateLinks)].length 

                const noLoopLinks = activeNodes.length === 0 ? Object.values(ui.layout._data.link).filter(link => link.config.isLoop).length
                    : [...new Set(activeIntermediateLinks.filter(el => el.__data__.config.isLoop))].length 

                const noLoopNodes = activeNodes.length === 0 ? Object.values(ui.layout._data.node).filter(node => node.state.config.hasLoop).length
                    : [...new Set(activeIntermediateNodes.filter(el => el.__data__.state.config.hasLoop))].length 

                const noReturnLinks = activeNodes.length === 0 ? Object.values(ui.layout._data.link).filter(link => link.config.isReturn).length
                    : [...new Set(activeIntermediateLinks.filter(el => el.__data__.config.isReturn))].length 

                const noReturnNodes = activeNodes.length === 0 ? Object.values(ui.layout._data.node).filter(node => node.state.config.returnNodes.length > 0).length
                    : [...new Set(activeIntermediateNodes.filter(el => el.__data__.state.config.returnNodes.length > 0))].length 

                const noFeedbackLinks = activeNodes.length === 0 ?  Object.values(ui.layout._data.link).filter(link => link.config.direction.major === 'backward').length
                    : [...new Set(activeIntermediateLinks.filter(link => link.__data__.config.direction.major === 'backward'))].length 

                const noFailurePointLinks = activeNodes.length === 0 ?  Object.values(ui.layout._data.link).filter(link => link.config.singleFailurePoint === 'yes').length
                    : [...new Set(activeIntermediateLinks.filter(link => link.__data__.config.singleFailurePoint === 'yes'))].length 

                const noSpecialisedLinks = activeNodes.length === 0 ?  Object.values(ui.layout._data.link).filter(link => link.config.fromSpecial === 'yes').length
                    : [...new Set(activeIntermediateLinks.filter(link => link.__data__.config.fromSpecial === 'yes'))].length 

                d3.select('#data-node-intermediate').html(`x ${noIntermediate}`)
                d3.select('#data-node-intermediate_unit').html(`${noIntermediate === 1 ? 'entity' : 'entities'}`)
                d3.select('#data-node-intermediate-re').html(`x ${noIntermediateREs}`)
                d3.select('#data-node-intermediate-re_unit').html(`${noIntermediateREs === 1 ? 'entity' : 'entities'}`)
                d3.select('#data-node-intermediate-non-re').html(`x ${noIntermediateNonREs}`)
                d3.select('#data-node-intermediate-non-re_unit').html(`${noIntermediateNonREs === 1 ? 'entity' : 'entities'}`)
                d3.select('#data-node-intermediate-unconnected').html(`x ${noUnconnected}`)
                d3.select('#data-node-intermediate-unconnected_unit').html(`${noUnconnected === 1 ? 'entity is ' : 'entities are'}`)
                d3.select('#data-node-intermediate-source').html(`x ${noIntermediateSource}`)
                d3.select('#data-node-intermediate-source_unit').html(`${noIntermediateSource === 1 ? 'entity is a supplier' : 'entities are suppliers'}`)
                d3.select('#data-node-intermediate-sink').html(`x ${noIntermediateSink}`)
                d3.select('#data-node-intermediate-sink_unit').html(`${noIntermediateSink === 1 ? 'entity is a customer' : 'entities are customers'}`)
                d3.select('#data-node-intermediate-intermediate').html(`x ${noIntermediateIntermediate}`)
                d3.select('#data-node-intermediate-intermediate_unit').html(`${noIntermediateIntermediate === 1 ? 'entity is' : 'entities are'}`)


                d3.select('#data-link-intermediate').html(`x ${noIntermediateLinks}`)
                d3.select('#data-link-intermediate_unit').html(`${noIntermediateLinks === 1 ? 'link' : 'links'}`)
                d3.select('#data-link-loops').html(`x ${noLoopLinks}`)
                d3.select('#data-link-loops_unit').html(`${noLoopLinks === 1 ? 'link is' : 'links are'}`)
                d3.select('#data-node-loops').html(`x ${noLoopNodes}`)
                d3.select('#data-node-loops_unit').html(`${noLoopNodes === 1 ? 'entity' : 'entities'}`)
                d3.select('#data-link-return').html(`x ${noReturnLinks}`)
                d3.select('#data-link-return_unit').html(`${noReturnLinks === 1 ? 'link' : 'links'}`)
                d3.select('#data-node-return-pairs').html(`x ${noReturnNodes /2 } ${noReturnNodes /2 === 1 ? 'pair' : 'pairs'}`)
                d3.select('#data-link-feedback').html(`x ${noFeedbackLinks}`)

                d3.select('#data-link-failure-point').html(`x ${noFailurePointLinks}`)
                d3.select('#data-link-failure-point_unit').html(`${noFailurePointLinks === 1 ? 'link' : 'links'}`)

                d3.select('#data-link-specialised').html(`x ${noSpecialisedLinks}`)
                d3.select('#data-link-specialised_unit').html(`${noSpecialisedLinks === 1 ? 'link' : 'links'}`)

                /** SINKS */
                const activeSinkNodes = activeNodes.filter(el => el.classList.contains('sink')),
                    activeSinkLinks = activeLinks.filter(el => el.__data__.node.to.state.config.isSink)

                const noSinks = activeNodes.length === 0 ? ui.layout.node.cluster.byCategory.sink.length
                    : [... new Set(activeSinkNodes)].length  

                const noSinkLinks = activeNodes.length === 0 ?  Object.values(ui.layout._data.link).filter(link => link.node.to.state.config.isSink).length
                    : [...new Set(activeSinkLinks)].length 
    
                const noSinkMultiLinks = activeNodes.length === 0 ? Object.values(ui.layout.node.cluster.byCategory.sink).filter( node => Object.values(node.link.in).length > 1).length
                    : [...new Set(activeSinkNodes.filter( el => Object.values(el.__data__.link.in).length > 1)) ].length
                        
                const noSinkSingleLinks = noSinkLinks - noSinkMultiLinks

                d3.select('#data-node-sink').html(`x ${noSinks}`)
                d3.select('#data-node-sink_unit').html(`${noSinks === 1 ? 'entity' : 'entities'}`)
                d3.select('#data-node-sink-multi-link').html(`x ${noSinkMultiLinks}`)
                d3.select('#data-node-sink-multi-link_unit').html(`${noSinkMultiLinks === 1 ? 'entity' : 'entities'}`)
                d3.select('#data-node-sink-single-link').html(`x ${noSinkSingleLinks}`)
                d3.select('#data-node-sink-single-link_unit').html(`${noSinkSingleLinks === 1 ? 'entity' : 'entities'}`)
                d3.select('#data-link-sink').html(`x ${noSinkLinks}`)
                d3.select('#data-link-sink_unit').html(`${noSinkLinks === 1 ? 'link' : 'links'}`)
            },

            // Link styling
            hideLinksAll: () => {
            },
            hideLinksSourceOut: ()=> {
            },
            hideLinksIntermediateOut: () => {
            },

            // Visual network trace and blend
            visualTrace: (node) => {
                // i.Init object for node selection
                const initObj = {
                    network:        node ? node.data.network.tree : null,
                    maxDepth:       node ? node.data.network.depth : null,
                    visibleDepth: {     // Init to 0
                        upstream:   1,
                        downstream: 1
                    }
                }

                // ii. Retrieve existing or add 
                const obj = ui.state.selection.node.network[node.id] =  ui.state.selection.node.network[node.id] ?? initObj

                // iii. Mute the node-link components
                if (obj.visibleDepth.upstream === 1 && obj.visibleDepth.downstream === 1){
                    ui.handle.muteNodes()
                    ui.handle.muteLinks()
                }

                // iv. Highlight the primary node (depth 0)
                ui.handle.highlightNodeSelection([node], 'primary')
                
                // vi. Highlight the next level of nodes and links
                if(obj.visibleDepth.upstream <= obj.maxDepth.upstream){
                    const upstreamNodes = obj.network[obj.visibleDepth.upstream].node.upstream
                    if(upstreamNodes){
                        ui.handle.highlightNodeSelection(upstreamNodes, 'upstream')

                        const upstreamLinks = obj.network[obj.visibleDepth.upstream].link.upstream
                        ui.handle.highlightLinkSelection(upstreamLinks, 'upstream')
                    }
                }

                if(obj.visibleDepth.downstream <= obj.maxDepth.downstream){
                    const downstreamNodes = obj.network[obj.visibleDepth.upstream].node.downstream
                    if(downstreamNodes){
                        ui.handle.highlightNodeSelection(downstreamNodes, 'downstream')

                        const downstreamLinks = obj.network[obj.visibleDepth.downstream].link.downstream
                        ui.handle.highlightLinkSelection(downstreamLinks, 'downstream')
                    }
                }

                // v. Increment depth
                obj.visibleDepth.upstream++
                obj.visibleDepth.downstream++

                // ==> Test if trace at the en
                const atEnd = (obj.visibleDepth.upstream > obj.maxDepth.upstream) && (obj.visibleDepth.downstream  >obj.maxDepth.downstream)

                return atEnd

            },
            visualTraceMulti: (nodes) => {

                // i. Get array of network trees
                const trees = []
                nodes.forEach( node => {
                    trees.push(node.data.network.tree)
                })

                // ii. Mute the node-link components
                ui.handle.muteNodes()
                ui.handle.muteLinks()
                

                // iv. Highlight the primary nodes (depth 0)
                ui.handle.highlightNodeSelection(nodes, 'primary')

                // v. Get all nodes and links across all trees and depths > 1
                let upstreamNodes = [],
                    downstreamNodes = [],
                    upstreamLinks   = [],
                    downstreamLinks = []

                trees.forEach(tree => {
                    Object.entries(tree).forEach( ([depth, obj]) => {

                        if(depth > 0){
                            if(obj.node.upstream)   upstreamNodes   = [...new Set([...upstreamNodes,   ...obj.node.upstream])]
                            if(obj.node.downstream) downstreamNodes = [...new Set([...downstreamNodes, ...obj.node.downstream])]
                            if(obj.link.upstream)   upstreamLinks   = [...new Set([...upstreamLinks,   ...obj.link.upstream])]
                            if(obj.link.downstream) downstreamLinks = [...new Set([...downstreamLinks, ...obj.link.downstream])]
                        }
                    })
                })

                // vi. highlight node and link selection
                if(upstreamNodes) ui.handle.highlightNodeSelection(upstreamNodes, 'upstream')
                if(upstreamLinks) ui.handle.highlightLinkSelection(upstreamLinks, 'upstream')

                if(downstreamNodes) ui.handle.highlightNodeSelection(downstreamNodes, 'downstream')
                if(downstreamLinks) ui.handle.highlightLinkSelection(downstreamLinks, 'downstream')

            },
            visualTraceToEnd: (node) => {
                // Trace node to end of network
                let end = false
                while(!end) end = ui.handle.visualTrace(node)
            },
            updateTraceUI: () => {
                // i. Get node information
                const node  = ui.state.selection.node.instances.primary[0],
                    name    = node.meta.label,
                    isResponsibleEntity = node.state.config.isResponsibleEntity,
                    isSource  = node.state.config.isSource,
                    isSink    = node.state.config.isSink

                const entityType = isResponsibleEntity ? 'Responsible entity' : 
                        isSource ? 'Upstream supplier only' :
                            isSink ? 'Downstream customer only' : 'Intermediate entity (supplier and customer)'

                // ii. Update name and entity type
                d3.selectAll('.selected-node').html(name)
                d3.selectAll('.trace-selection-info.entity-type').html(entityType)

                // iii. Get EWS information (for REs)
                const ewsSchema = layout._data.schema['essential-wrrr-services'],
                    ewsArray    = node.state.config['essential-wrrr-services'],
                    ewsList     = !ewsArray ? null :  join.toOxfordList(node.state.config['essential-wrrr-services'].map(id => ewsSchema[id].name))


                // iv. Update essential waste services (RE only)
                const ewsContainer = d3.select('.trace-selection-info-container.ews')
                ewsContainer.selectAll("*").remove()    // Clear any prior data to empty for non-REs

                if(ewsList){
                    ewsContainer.append('div')
                        .classed('trace-selection-info-label', true)
                        .html('Essential waste services:')

                    ewsContainer.append('div')
                        .classed('trace-selection-info', true)
                        .html(ewsList)
                }

                // v. Add trace level indicators for upstream and downstream
                const traceData = ui.state.selection.node.network[node.id],
                    upstreamTraceLevel = traceData.visibleDepth.upstream - 1,
                    downstreamTraceLevel  = traceData.visibleDepth.downstream - 1

                let upstreamNodeCount = 0, downstreamNodeCount = 0

                const upstreamIndicatorContainer = d3.select('.trace-depth-indicator-container.upstream')

                for(let i = 0; i < traceData.maxDepth.upstream; i++){
                    if(i === 0) upstreamIndicatorContainer.selectAll("*").remove() 

                    upstreamNodeCount += traceData.network[i+1].link.upstream.length
                    upstreamIndicatorContainer.append('div')
                        .attr('class', 'trace-level-indicator')
                        .classed('visible', i < upstreamTraceLevel)
                        .html(`${upstreamNodeCount}`)
                }

                const downstreamIndicatorContainer = d3.select('.trace-depth-indicator-container.downstream')
                for(let i = 0; i < traceData.maxDepth.downstream; i++){
                    if(i === 0) downstreamIndicatorContainer.selectAll("*").remove()

                    downstreamNodeCount += traceData.network[i+1].link.downstream.length
                    downstreamIndicatorContainer.append('div')
                        .attr('class', 'trace-level-indicator')
                        .classed('visible', i < downstreamTraceLevel)
                        .html(`${downstreamNodeCount}`)
                }

                // vi. Show indicagore container
                ui.handle.toggleTraceContent(true)
            },
            updateBlendUI: (nodes) => {
                // Update blend list selection
                const nodeList = d3.select('.blend-selection-list')

                // Clear list to rerender all items
                nodeList.selectAll('*').remove()    

                nodes.forEach(node => {
                    nodeList.append('li')
                        .html(node.meta.label)
                })

                // Show container
                ui.handle.toggleBlendContent(true)  
            },

            // Mute / unmute nodes amd links
            muteNodes:      () => { d3.selectAll(`.node-group`).classed('mute', true) },
            unmuteNodes:    () => { d3.selectAll(`.node-group`).classed('mute', false)},
            muteLinks:      () => { d3.selectAll(`.link-group`).classed('mute', true) },
            unmuteLinks:    () => { d3.selectAll(`.link-group`).classed('mute', false)},

            // Highlight selected nodes and links
            highlightNodeSelection: (nodeArray, type, opacity) => {
                // Highlight selection (and unmute)
                ui.state.selection.node.instances[type] = [...new Set([...ui.state.selection.node.instances[type], ...nodeArray])]

                ui.state.selection.node.instances[type].forEach( node => {
                    const selection = d3.select(`#node_${node.id}`)
                        .classed('highlight', true)
                        .classed(type, true)
                        .classed('mute', false)

                    ui.state.active.node = [...ui.state.active.node, ...selection]

                    return selection
                })
            },
            highlightLinkSelection: (linkArray, type, opacity) => {
                // Mute all
                ui.state.selection.link.instances[type] = [...new Set([...ui.state.selection.link.instances[type], ...linkArray])]
                // Highlight selection
                ui.state.selection.link.instances[type].forEach( link => {
                    const selection =  d3.select(`#link_${link.id}`)
                        .classed('highlight', true)
                        .classed(type, true)
                        .classed('mute', false)

                    ui.state.active.link = [...ui.state.active.link, ...selection]

                    return selection
                })
            },

            // Reset selection
            reset: () => {
                // Remove class and reset 
                const nodeTypes = ['primary', 'upstream', 'downstream']
                const linkTypes = ['upstream', 'downstream']

                nodeTypes.forEach(type => {
                    const selection = ui.state.selection.node.instances[type].map(node => `#node_${node.id}`).join(',')
                    if(selection){
                        d3.selectAll(selection)
                            .classed('highlight', false)
                            .classed(type, false)    
                            .style('opacity', null)
                        ui.state.selection.node.instances[type] = []
                    }
                })

                linkTypes.forEach(type => {
                    const selection = ui.state.selection.link.instances[type].map(link => `#link_${link.id}`).join(',')
                    if(selection){
                        d3.selectAll(selection)
                            .classed('highlight', false)
                            .classed(type, false)   
                            .style('opacity', null) 

                        ui.state.selection.link.instances[type] = []
                    }
                })

                // Reset muted notes and links
                ui.handle.unmuteNodes()
                ui.handle.unmuteLinks()

                // Reset node selection
                ui.state.selection.node.network = {}
                ui.state.active.node = []
                ui.state.active.link = []

                selectedNodes = []

                // Hide trace and blend containers
                ui.handle.toggleTraceContent(false)
                ui.handle.toggleBlendContent(false)

                // Off vulnerability options
                ui.handle.toggleOffVulnerabilityOptions()

                //  Update data legend
                ui.handle.updateLegend()

                // Update labels
                d3.selectAll('.node-label-group-all').classed('visible', false )
            
            },
            resetLabelSelection(){
                if(ui.state.view.networkLabels){

                    let nodesSelected = Object.values(ui.state.selection.node.instances).flat()

                    if(nodesSelected.length > 0){
                        d3.selectAll('.node-label-group-all').classed('visible', false )

                        if(ui.state.mode.entities.reIncognito){
                            // Filter for direct connections 
                            const  primaryNode = ui.state.selection.node.instances.primary[0]
                            nodesSelected = [
                                primaryNode, 
                                ...Object.values(primaryNode.link.out).map( link => link.node.to),
                                ...Object.values(primaryNode.link.in).map( link => link.node.from)
                            ]
                        } 

                        d3.selectAll('.node-label-group-all').filter(d => nodesSelected.includes(d))
                             .classed('visible', ui.state.view.networkLabels )
                    
                    } else {
                        if((ui.state.mode.app !== 'entities' && ui.state.mode.entities !== 'responsible') || !ui.state.mode.entities.reIncognito){
                            d3.selectAll('.node-label-group-all').classed('visible', ui.state.view.networkLabels )
                        }
                    } 
                } else {
                    if(!ui.state.mode.entities.reIncognito){
                        d3.selectAll('.node-label-group-all').classed('visible', ui.state.view.networkLabels )
                    }
                }
            },
            // Interaction handler
            zoom: (e) =>{
                d3.select('#chart')
                    .attr('transform', e.transform);
            },

            // Toggle and set
            toggleMode: (mode, isOn) => {
                const modeClass = `mode_${mode}`
                app.classed(modeClass, isOn ??!app.classed(modeClass))
            },
            toggleInfoPane: (isVisible) => {
                 ui.state.view.pane.info = isVisible ?? !ui.state.view.pane.info 
                 const display =  ui.state.view.pane.info ? 'initial' : 'none'
                 d3.select('section.ui').style('display', display)
            },
            toggleVisPane: (isVisible) => {
                 ui.state.view.pane.vis = isVisible ?? !ui.state.view.pane.vis 
                 const display =  ui.state.view.pane.vis ? 'initial' : 'none'
                 d3.select('section.vis').style('display', display)
            },
            toggleLegendPane: (isVisible) => {
                 ui.state.view.pane.legend = isVisible ?? !ui.state.view.pane.legend 
                 const display =  ui.state.view.pane.legend ? 'initial' : 'none'
                 d3.select('section.legend').style('display', display)
            },
            toggleInfoContent: (isVisible) => {
                ui.state.view.infoContent = isVisible ?? !ui.state.view.infoContent 
                const display = ui.state.view.infoContent ? 'grid   ' : 'none'

                d3.selectAll('.ui-mode-container, .ui-info-container, .ui-options-container').style('display', display)
                d3.select('main#app-container').classed('centered', !ui.state.view.infoContent )
            },
            toggleTraceContent(isVisible){
                ui.state.view.traceContent = isVisible ?? !ui.state.view.traceContent 
                d3.selectAll('.trace-selection-container').style('display',  isVisible ? 'revert' : 'none')       
                setTimeout(() => {
                    d3.selectAll('.trace-selection-container').classed('hide',  !ui.state.view.traceContent )
                }, 10);   
            },
            toggleTips: (isVisible) => {
                ui.state.view.guidance = isVisible ?? !ui.state.view.guidance 
                document.getElementById('tips-selector').checked = ui.state.view.guidance
                d3.selectAll('.guidance').classed('hide', !ui.state.view.guidance)
            },
            toggleVisDetails: (isOn) => {
                app.classed('mode_detail', isOn ?? !app.classed('mode_detail'))
                document.getElementById('details-selector').checked = app.classed('mode_detail')
            },
            toggleLabels: (isOn) => {
                ui.state.view.networkLabels = isOn ?? !ui.state.view.networkLabels
                document.getElementById('labels-selector').checked = ui.state.view.networkLabels
                ui.handle.resetLabelSelection()
            },
            toggleBrowseDepth(isFull){
                ui.state.mode.entities.hoverDepthFull = isFull ?? !ui.state.mode.entities.hoverDepthFull 
                document.getElementById('browse-depth-selector').checked = ui.state.mode.entities.hoverDepthFull 

                d3.selectAll('.browse-depth-selector.switch-label ').classed('selected', false)
                if(ui.state.mode.entities.hoverDepthFull){
                    d3.select('.switch-label.right').classed('selected', true)
                } else {
                    d3.select('.switch-label.left').classed('selected', true)
                }
            },
            toggleResponsibleDepth(isFull){
                ui.state.mode.entities.responsibleDepthFull = isFull ?? !ui.state.mode.entities.responsibleDepthFull 
                document.getElementById('responsible-depth-selector').checked = ui.state.mode.entities.responsibleDepthFull 

                d3.selectAll('.responsible-depth-selector.switch-label ').classed('selected', false)
                if(ui.state.mode.entities.responsibleDepthFull){
                    d3.select('.switch-label.responsible-depth-selector.right').classed('selected', true)
                } else {
                    d3.select('.switch-label.responsible-depth-selector.left').classed('selected', true)
                }

                ui.handle.setResponsibleEntity()
            },
            toggleReIncognito(isOn){
                ui.state.mode.entities.reIncognito = isOn ?? !ui.state.mode.entities.reIncognito 
                document.getElementById('re-incognito-selector').checked = ui.state.mode.entities.reIncognito 

                d3.selectAll('.re-incognito-selector.switch-label ').classed('selected', false)
                if(ui.state.mode.entities.reIncognito){
                    d3.select('.switch-label.re-incognito-selector.right').classed('selected', true)
                    d3.selectAll('.responsible-entity-selector-label')
                        .html( d => `${d.meta['label-incognito']}`)
                } else {
                    d3.select('.switch-label.re-incognito-selector.left').classed('selected', true)
                    d3.selectAll('.responsible-entity-selector-label')
                        .html(d => `${d.meta.label}`)
                }

                ui.handle.setResponsibleEntity()
                ui.handle.resetLabelSelection()
            },

            toggleBlend(isOn){
                ui.state.mode.entities.blendOn == isOn ?? !app.classed('mode_blend')
                app.classed('mode_blend', isOn ?? ui.state.mode.entities.blendOn)
            },
            toggleBlendContent(isVisible){
                ui.state.view.blendContent = isVisible ?? !ui.state.view.blendContent 

                d3.selectAll('.blend-selection-container').style('display',  isVisible ? 'revert' : 'none')       
                setTimeout(() => {
                    d3.selectAll('.blend-selection-container').classed('hide',  !ui.state.view.blendContent )
                }, 10);  

            },
            toggleFailurePoints: (isVisible) => {
                ui.handle.reset()
                // Toggle switch and set state and style mode
                ui.state.mode.vulnerability.failure = isVisible ?? !ui.state.mode.vulnerability.failure 
                app.classed('mode_failure-point', ui.state.mode.vulnerability.failure)
                document.getElementById('failure-point-selector').checked = ui.state.mode.vulnerability.failure 

                if(ui.state.mode.vulnerability.failure){
                    // Get all links and nodes to highlight
                    const links = Object.values(ui.layout._data.link).filter(link => link.config.singleFailurePoint === 'yes')
                    const nodes = [...new Set(links.map( link => [link.node.from, link.node.to]).flat())]

                    ui.handle.muteLinks()
                    ui.handle.muteNodes()
                    ui.handle.highlightLinkSelection(links, 'upstream')
                    ui.handle.highlightNodeSelection(nodes,  'upstream')

                    // Turn off other vulnerability views
                    ui.state.mode.vulnerability.specialised = false
                    app.classed('mode_specialised', ui.state.mode.vulnerability.specialised)
                    document.getElementById('specialised-suppliers-selector').checked = ui.state.mode.vulnerability.specialised 
                }

                //  Update data legend and reset labels
                ui.handle.updateLegend()
                ui.handle.resetLabelSelection()
            },
            toggleSpecialisedSuppliers: (isVisible) => {
                ui.handle.reset()

                // Toggle swicth and set state and style mode
                ui.state.mode.vulnerability.specialised = isVisible ?? !ui.state.mode.vulnerability.specialised 
                app.classed('mode_specialised', ui.state.mode.vulnerability.specialised)
                document.getElementById('specialised-suppliers-selector').checked = ui.state.mode.vulnerability.specialised 

                if(ui.state.mode.vulnerability.specialised){
                    // Get all links and nodes to highlight
                    const links = Object.values(ui.layout._data.link).filter(link => link.config.fromSpecial === 'yes')
                    const nodes = [...new Set(links.map( link => [link.node.from, link.node.to]).flat())]

                    ui.handle.muteLinks()
                    ui.handle.muteNodes()
                    ui.handle.highlightLinkSelection(links, 'upstream')
                    ui.handle.highlightNodeSelection(nodes,  'upstream')

                    // Turn off other vulnerability views
                    ui.state.mode.vulnerability.failure = false 
                    app.classed('mode_failure-point', ui.state.mode.vulnerability.failure)
                    document.getElementById('failure-point-selector').checked = ui.state.mode.vulnerability.failure 
                }

                //  Update data legend and reset labels
                ui.handle.updateLegend()
                ui.handle.resetLabelSelection()
            },
            toggleOffVulnerabilityOptions: () => {
                ui.state.mode.vulnerability.specialised = false
                app.classed('mode_specialised', ui.state.mode.vulnerability.specialised)
                document.getElementById('specialised-suppliers-selector').checked = ui.state.mode.vulnerability.specialised 

                ui.state.mode.vulnerability.failure = false 
                app.classed('mode_failure-point', ui.state.mode.vulnerability.failure)
                document.getElementById('failure-point-selector').checked = ui.state.mode.vulnerability.failure 

                ui.state.mode.vulnerability.internalLoops =  false
                document.getElementById('internal-loop-selector').checked = ui.state.mode.vulnerability.internalLoops 

                ui.state.mode.vulnerability.returnLoops = false
                document.getElementById('return-loop-selector').checked = ui.state.mode.vulnerability.returnLoops 

                ui.state.mode.vulnerability.feedbackLinks = false
                document.getElementById('feedback-links-selector').checked = ui.state.mode.vulnerability.feedbackLinks 

            },
            toggleInternalLoops: (isVisible) => {
                ui.handle.reset()

                // Toggle switch and set state and style mode
                ui.state.mode.vulnerability.internalLoops = isVisible ?? !ui.state.mode.vulnerability.internalLoops 
                document.getElementById('internal-loop-selector').checked = ui.state.mode.vulnerability.internalLoops 

                if(ui.state.mode.vulnerability.internalLoops){
                    // Get all links and nodes to highlight
                    const links = Object.values(ui.layout._data.link).filter(link => link.config.isLoop)
                    const nodes = [...new Set(links.map( link => [link.node.from, link.node.to]).flat())]

                    ui.handle.muteLinks()
                    ui.handle.muteNodes()
                    ui.handle.highlightLinkSelection(links, 'upstream')
                    ui.handle.highlightNodeSelection(nodes, 'upstream')
                }

                //  Update data legend and reset labels
                ui.handle.updateLegend()
                ui.handle.resetLabelSelection()
            },
            toggleReturnLoops: (isVisible) => {
                ui.handle.reset()

                // Toggle switch and set state and style mode
                ui.state.mode.vulnerability.returnLoops = isVisible ?? !ui.state.mode.vulnerability.returnLoops 
                document.getElementById('return-loop-selector').checked = ui.state.mode.vulnerability.returnLoops 

                if(ui.state.mode.vulnerability.returnLoops){
                    // Get all links and nodes to highlight
                    const nodes = Object.values(ui.layout._data.node).filter(node => node.state.config.returnNodes.length > 0)

                    let links = []
                    nodes.forEach( node => {
                        const linksOut      = Object.values(node.link.out)
                        const nodesOut      = [...new Set(linksOut.map(link => link.node.to))]
                        const linksOutOut   = nodesOut.map(node => Object.values(node.link.out)).flat()
                        
                        
                        links.push(linksOutOut.filter(link => link.node.to === node))
                    })

                    links = [... new Set(links.flat())]

                    ui.handle.muteLinks()
                    ui.handle.muteNodes()
                    ui.handle.highlightLinkSelection(links, 'upstream')
                    ui.handle.highlightLinkSelection(links, 'downstream')
                    ui.handle.highlightNodeSelection(nodes,  'downstream')
                }

                //  Update data legend and reset labels
                ui.handle.updateLegend()
                ui.handle.resetLabelSelection()
            },
            toggleFeedbackTrigger: (isVisible) => {
                ui.handle.reset()

                // Toggle switch and set state and style mode
                ui.state.mode.vulnerability.feedbackLinks = isVisible ?? !ui.state.mode.vulnerability.feedbackLinks 
                document.getElementById('feedback-links-selector').checked = ui.state.mode.vulnerability.feedbackLinks 

                if(ui.state.mode.vulnerability.feedbackLinks){
                    // Get all links and nodes to highlight
                    const links = Object.values(ui.layout._data.link).filter(link => link.config.direction.major === 'backward')
                    const nodes = [... new Set(links.map(link => [link.node.from, link.node.to]).flat() )]
                    // ui.handle.muteLinks()
                    ui.handle.muteLinks()
                    ui.handle.muteNodes()
                    ui.handle.highlightLinkSelection(links, 'upstream')
                    ui.handle.highlightLinkSelection(links, 'downstream')
                    ui.handle.highlightNodeSelection(nodes,  'upstream')
                }

                //  Update data legend and reset labels
                ui.handle.updateLegend()
                ui.handle.resetLabelSelection()
            },

            // SET APP MODE
            setMode: function(mode) {
                // Setup if coming from mode (i.e. app state in prior mode)
                switch( ui.state.mode.app){
                    case 'service':
                    case 'vulnerability':
                        ui.handle.reset()
                        break
                    case 'entities':
                        ui.handle.toggleReIncognito(false)
                }

                // Update app state
                ui.state.mode.app = mode ?? ui.state.mode.app 
                // Set mode to ui-info-container to trigger view options (see style.css INFO CONTENT VIEW)
                d3.select('.ui-info-container').attr('class', `ui-info-container ${ui.state.mode.app }-mode`)
                // Update mode menu selection
                d3.selectAll('.ui-mode-option').classed('selected', false)
                d3.select(`.ui-mode-option.${ui.state.mode.app}-mode`).classed('selected', true)

                // Set sub-modes
                ui.handle.setServiceMode()
                ui.handle.setVulnerabilityMode()
                ui.handle.setEntitiesMode()
                ui.handle.setKeyMode()
            },

            /** SUB MODE OPTIONS */
            setEntitiesMode: function(mode){
                if(typeof node !== 'undefined' && ui.state.mode.entities.mode === 'responsible'){
                     ui.handle.toggleReIncognito(false)
                } 

                mode = ui.state.mode.entities.mode = mode ?? ui.state.mode.entities.mode 
                d3.select('.ui-info-wrapper.entities-mode').attr('class', `ui-info-wrapper entities-mode ${mode}`)
                d3.selectAll(`.entities-mode li`).classed('selected', false)
                d3.select(`.entities-mode li.${mode}-mode`).classed('selected', true)

                switch(mode){
                    case 'responsible':
                        ui.handle.reset()
                        ui.handle.toggleReIncognito(true)
                        break
                    default:
                }    
            },
            setServiceMode: function(mode){
                mode = ui.state.mode.service.mode = mode ?? ui.state.mode.service.mode 
                d3.select('.ui-info-wrapper.service-mode').attr('class', `ui-info-wrapper service-mode ${mode}`)
                d3.selectAll(`.service-mode li`).classed('selected', false)
                d3.select(`.service-mode li.${mode}-mode`).classed('selected', true)

                // Reset selection
                ui.handle.reset()
                d3.selectAll('.esw-input.checkbox-input input').property('checked', false)
                d3.selectAll('.service-input.checkbox-input input').property('checked', false)
                d3.selectAll('.frequency-input.checkbox-input input').property('checked', false)
            },
            setVulnerabilityMode: function(mode){
                mode = ui.state.mode.vulnerability.mode = mode ?? ui.state.mode.vulnerability.mode 

                d3.select('.ui-info-wrapper.vulnerability-mode').attr('class', `ui-info-wrapper vulnerability-mode ${mode}`)
                d3.selectAll(`.vulnerability-mode li`).classed('selected', false)
                d3.select(`.vulnerability-mode li.${mode}-mode`).classed('selected', true)
            },
            setKeyMode: function(mode){
                mode = ui.state.mode.key.mode = mode ?? ui.state.mode.key.mode 

                d3.select('.ui-info-wrapper.key-mode').attr('class', `ui-info-wrapper key-mode ${mode}`)
                d3.selectAll(`.key-mode li`).classed('selected', false)
                d3.select(`.key-mode li.${mode}-mode`).classed('selected', true)
            },

            /** UPDATE FILTERING OPTIONS */
            setResponsibleEntity:  function(el, id) {
                /**
                 *  I. Deactivate if already selected
                 */ 
                if(ui.state.mode.entities.responsible === id && el){
                    console.log('Deselect', el, el.name )

                    // i. Reset radio selector
                    const selected = document.querySelector(`input[name="${el.name}"]:checked`);
                    if (selected)  selected.checked = false;
                    
                    // ii. Reset the visual
                    ui.handle.reset()

                    // iii.Reset the selector labels
                    d3.selectAll('.responsible-entity-selector-label')
                        .html( d => ui.state.mode.entities.reIncognito ? `${d.meta['label-incognito']}` : `${d.meta.label}`)

                    // iv. Reset selected
                    ui.state.mode.entities.responsible = null

                    // v. Reset labels (for when labels are toggled on)
                    ui.handle.resetLabelSelection()
                    return 
                } 

                /**
                 *  II. Set responsible entity
                 */
                // i. Update state and get selected RE node 
                ui.state.mode.entities.responsible = id ?? ui.state.mode.entities.responsible 

                if(typeof node !== 'undefined'){
                    const selectedRE = node[ui.state.mode.entities.responsible]
                    if(!selectedRE) return

                    // ii. Reset the visualisation 
                    ui.handle.reset()

                    // iii. Perform visual trace
                    switch(ui.state.mode.entities.responsibleDepthFull){
                        case true:
                            ui.handle.visualTraceToEnd(selectedRE)
                            break
                        case false:
                        default: 
                            ui.handle.visualTrace(selectedRE)
                    }

                    ui.handle.updateTraceUI()
                    selectedNodes = [...new Set([...selectedNodes, selectedRE])]

                    // vi. Update data legend and reset labels
                    ui.handle.updateLegend()
                    ui.handle.resetLabelSelection()

                    // vii. Set RE selector labels
                    if(ui.state.mode.entities.reIncognito){
                        d3.selectAll('.responsible-entity-selector-label')
                            .html( d => `${d.meta['label-incognito']}`)
                        d3.selectAll(`#re-label-${selectedRE.id}`)
                            .html(d => `${d.meta.label}`)
                    } else {
                        d3.selectAll('.responsible-entity-selector-label')
                            .html(d => `${d.meta.label}`)
                    }

                } else {
                    // On load. Set RE selector labels
                    d3.selectAll('.responsible-entity-selector-label')
                        .html( d => ui.state.mode.entities.reIncognito ? `${d.meta['label-incognito']}` : `${d.meta.label}`)
        
                }
            },
            setEWS:  function(el, id) {
                ui.state.mode.service.eswSelect[id] = el.checked
                // i. Get selected EWSs
                const ewsSelected = Object.entries(ui.state.mode.service.eswSelect)
                    .filter( ([id, value]) => value)
                    .map( d => d[0])

                // ii. Get nodes with selected EWSs
                const selectedNodes = Object.values(ui.layout._data.node)
                    .filter(node => node.state.config.isResponsibleEntity)
                    .filter(node => node.state.config['essential-wrrr-services'].filter(d => ewsSelected.includes(d)).length >0 )

                // iii. Reset visual  and turn on blend mode
                ui.handle.reset()
                
                // iv. Highlight trace
                ui.handle.visualTraceMulti(selectedNodes)

                // v. Update data legend and reset labels
                ui.handle.updateLegend()
                ui.handle.resetLabelSelection()
            }, 
            setService:  function(el, id, type) {
                // i. Update checkbox state
                ui.state.mode.service.serviceSelect[type][id] = el.checked

                // ii. Aggregated allTypesSelected with loop
                const nodeTypes  = ['source', 'sink', 'intermediate']

                let allTypesSelected = []

                nodeTypes.forEach( nodeType => {
                    // a. Get selected services
                    const servicesSelected = Object.entries(ui.state.mode.service.serviceSelect[nodeType])
                        .filter( ([id, value]) => value)
                        .map( d => d[0])

                    // b. Get nodes with selected services
                    const selectedNodes = Object.values(ui.layout._data.node)
                        .filter(node => {
                            switch(nodeType){
                                case 'source':
                                    return node.state.config.isSource
                                case 'sink':
                                    return node.state.config.isSink
                                case 'intermediate':
                                    return node.state.config.isIntermediate &&  !node.state.config.isResponsibleEntity 

                            }
                        })
                        .filter(node => node.state.config.service.assigned.filter(d => servicesSelected.includes(d)).length > 0 )

                    // c. Add to allTypesSelected 
                    allTypesSelected = [... new Set([...allTypesSelected, ...selectedNodes])]
                })

                // iii. Reset visual  and turn on blend mode
                ui.handle.reset()

                // iv. a. Mute if no selection
                if(allTypesSelected.length === 0){
                    ui.handle.muteNodes()
                    ui.handle.muteLinks()

                // v. a. Trace a visual each node to the end of the network
                } else{
                  ui.handle.visualTraceMulti(allTypesSelected)
                }


                // vi. Update data legend and reset labels
                ui.handle.updateLegend()
                ui.handle.resetLabelSelection()

            },
            setFrequency:  function(el, id) {
                ui.state.mode.service.frequencySelect = el.value
                ui.handle.reset()
                const links = Object.values(ui.layout._data.link).filter( link => link.config.frequency === el.value)
                const nodes = [...new Set(links.map(link => [link.node.from, link.node.to]).flat())]

                ui.handle.muteLinks()
                ui.handle.muteNodes()
                ui.handle.highlightLinkSelection(links, 'upstream')
                ui.handle.highlightNodeSelection(nodes, 'upstream')

                // Reset labels
                ui.handle.resetLabelSelection()

                // vi. Update data legend and reset labels
                ui.handle.updateLegend()
                ui.handle.resetLabelSelection()
            }
        }
    }

    // Keyboard handlers: bound to document
    #addKeyHandler(){
        const handle = {
            keydown: function(ev){
                // console.log(ev)
                switch(ev.key) {
                    // Shift and guidance/info on
                    case "Shift":
                        ui.state.isShift = true
                        break

                    // App reset
                    case "Escape":
                        ui.handle.reset()
                        break 

                    // APP MODES AND SUB MODES
                    case "1":
                        ui.handle.setMode('overview')
                        break
                    case "2":
                        ui.handle.setMode('entities')
                        break
                    case "3":
                         ui.handle.setMode('service')
                        break
                    case "4":
                        ui.handle.setMode('vulnerability')
                        break
                    case "5":
                         ui.handle.setMode('key')
                        break

                    case "q":
                        switch(ui.state.mode.app){
                            case 'overview':
                                break
                            case 'entities':
                                ui.handle.setEntitiesMode('responsible')
                                break
                            case 'service':
                                ui.handle.setServiceMode('esw')
                                break
                            case 'vulnerability':
                                ui.handle.setVulnerabilityMode('failure-specialised')
                                break
                            case 'key':
                                ui.handle.setKeyMode('node-link')
                                break
                        }
                        break

                    case "w":
                        switch(ui.state.mode.app){
                            case 'overview':
                                break
                            case 'entities':
                                ui.handle.setEntitiesMode('browse')
                                break
                            case 'service':
                                ui.handle.setServiceMode('service')
                                break
                            case 'vulnerability':
                                ui.handle.setVulnerabilityMode('feedback')                   
                                break
                            case 'key':
                                ui.handle.setKeyMode('upstream-downstream')                   
                                break
                        }
                        break

                    case "e":
                        switch(ui.state.mode.app){
                            case 'overview':
                                break
                            case 'entities':
                                ui.handle.setEntitiesMode('trace')
                                break
                            case 'service':
                                ui.handle.setServiceMode('frequency')
                                break
                            case 'vulnerability':                   
                                break
                            case 'key':
                                ui.handle.setKeyMode('vis-detail')                         
                                break
                        }
                        break

                    case "r":
                        switch(ui.state.mode.app){
                            case 'overview':
                                break
                            case 'entities':
                                ui.handle.setEntitiesMode('blend')
                                break
                            case 'service':
                                break
                            case 'vulnerability':
                                break
                            case 'key':
                                break
                        }
                        break


                    // TOGGLE SWITCH
                    case "d":
                        ui.handle.toggleVisDetails()
                        break 
                    case "t":
                        ui.handle.toggleTips()
                        break    
                    case "l":
                        ui.handle.toggleLabels()
                        break    

                    // LAYOUT VIEW OPTIONS
                    case "[":
                        ui.handle.toggleInfoPane()
                        break 
                    case "]":
                        ui.handle.toggleLegendPane()
                        break 
                    case "p":
                        ui.handle.toggleInfoPane()
                        ui.handle.toggleLegendPane()
                        break 
                    case "\\":
                        ui.handle.toggleInfoContent()
                        break 
                }
            },

            keyup: function(ev){
                switch(ev.key) {
                    case "Shift":
                        ui.state.isShift = false
                        break
                }
            } 
        }

        // Bind to document
        document.addEventListener('keydown', handle.keydown)
        document.addEventListener('keyup', handle.keyup)
    }

    // Setup year select RE, Service UI input/selection options
    #addYearSelectUI() {
        const reportingYears = this.state.meta.reportingYears
        const yearSelector = d3.select('.report-year-select')   

        yearSelector.selectAll('*').remove()

        for( const year of reportingYears){
            yearSelector.append('option')
                .attr('value', year)
                .attr('selected', year ===  this.state.meta.reportYear )
                .html(year)
        }
    }

    #addResponsibleEntityUI(){
        const reNodes = Object.values(this.layout._data.node).filter(node => node.state.config.isResponsibleEntity), 
            container = d3.select('.responsible-entities-input-container')

        for( const node of reNodes){
            const inputContainer = container.append('div').classed('re-input checkbox-input', true)

            inputContainer.append('input')
                .attr('id', node.id)
                .attr('name', 'responsible-entity-selector')
                .attr('value', node.id)
                .attr('type', 'radio')
                // .on('change', function(){ ui.handle.setResponsibleEntity(this, node.id)})
                .on('click', function(){ ui.handle.setResponsibleEntity(this, node.id)})

            const label = inputContainer.append('label')
                .datum(node)
                .attr('id', `re-label-${node.id}`)
                .classed('responsible-entity-selector-label', true)
                .attr('for',  node.id)
                .html( d =>  `${d.meta.label}`)

        }
    }

    #addEwsUI(){
        const eswSchema = this.layout._data.schema['essential-wrrr-services'], 
            container = d3.select('.esw-inputs-container')

        for( const [id, state] of Object.entries(this.state.mode.service.eswSelect)){
            const nodeCount = Object.values(this.layout._data.node)
                .filter( node => node.state.config.isResponsibleEntity && node.state.config['essential-wrrr-services'].includes(id))
                .length

            const inputContainer = container.append('div').classed('esw-input checkbox-input', true)

            inputContainer.append('input')
                .attr('id', id)
                .attr('name', id)
                .attr('value', id)
                .attr('type', 'checkbox')
                .on('change', function(){ ui.handle.setEWS(this, id)})

            inputContainer.append('label')
                .attr('for', id)
                .html(`${eswSchema[id].name} (${nodeCount})`)
        }
    }

    #addServicesUI(){
        const servicesSchema = this.layout._data.schema['rv-services'],
            containerByType = {
                source:         d3.select('.service-source-inputs-container'),
                intermediate:   d3.select('.service-intermediate-inputs-container'),
                sink:           d3.select('.service-sink-inputs-container')
            }

        for(const [type, container] of Object.entries(containerByType)){
            for( const [id, state] of Object.entries(this.state.mode.service.serviceSelect[type])){
                const inputContainer = container.append('div').classed(`service-input checkbox-input ${type}`, true)

                const nodeCount = Object.values(this.layout._data.node)
                    .filter( node => {
                        switch(type){
                            case 'source':
                                return node.state.config.isSource
                            case 'sink':
                                return node.state.config.isSink
                            case 'intermediate':
                                return node.state.config.isIntermediate && node.state.config.isResponsibleEntity 
                        }
                    }).filter( node => node.state.config.service.assigned.includes(id))
                    .length

                inputContainer.append('input')
                    .attr('id', id)
                    .attr('name', id)
                    .attr('value', id)
                    .attr('type', 'checkbox')
                    .on('change', function(){ ui.handle.setService(this, id , type)})

                inputContainer.append('label')
                    .attr('for', id)
                    .html(`${id}`)
                    .html(`${servicesSchema[id].name} (${nodeCount})`)
            }
        }
    }

    #addFrequencyUI(){
        const frequencySchema = this.layout._data.schema['frequency'], 
            container = d3.select('.frequency-inputs-container')

        for( const [id, state] of Object.entries(frequencySchema)){
            const inputContainer = container.append('div').classed('frequency-input checkbox-input', true)

            const linkCount = Object.values(this.layout._data.link)
                    .filter( link => link.config.frequency === id) 
                    .length

            inputContainer.append('input')
                .attr('id', id)
                .attr('name', 'frequency')
                .attr('value', id)
                .attr('type', 'radio')
                .on('change', function(){ ui.handle.setFrequency(this, id)})

            inputContainer.append('label')
                .attr('for', id)
                .html(`${frequencySchema[id].name} (${linkCount})`)
        }
    }

    #addMetaData(){
        const entityCount = Object.keys(this.layout._data.node).length,
            linkCount = Object.keys(this.layout._data.link).length,
            reCount = this.layout.node.cluster.byCategory.responsibleEntity.length,
            nonReCount = entityCount - reCount

        d3.selectAll('.report-year').html(this.state.meta.reportYear)
        d3.selectAll('.responsible-entity-count').html(reCount)
        d3.selectAll('.non-responsible-entity-count').html(nonReCount)
        d3.selectAll('.entity-count').html(entityCount)
        d3.selectAll('.link-count').html(linkCount)
    }
}