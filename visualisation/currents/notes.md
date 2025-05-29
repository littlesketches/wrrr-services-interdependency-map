# Waste Services Map: Visualiation #1: CURRENTS

This a custom network visualisation whose layout highlights the direction of service interactions ("supplier to customer"), that flows on a single major axis (e.g. vertical or horizontal), and in one direction (e.g. 'top to bottom', 'left to right' etc.)

The intended design of CURRENTS visualisation is to run vertically, top to bottom. The language used in describing the layout trie to be agnostic to this decision, however references to this layout choice are included in brackets (e.g. references to the top/bottom/left/right to the visual)


## Layout: 'establishing layers' 
There are two clear layers of the network identified:
- The outer layer: containing: 
    - 'upstream suppliers' located at the start (top) of the network. These are entities that have been identified (by REs) only  as suppliers
    - 'downstream customers' located at the end (bottom) of th network. These are entities that have been identified (by REs) only  as customers.

- The inner layer of "intermediate network" that is centered, containing:
    - all Responsible Entities who report supplier and customers in their RERCC Plans
    - any entity who is reported by any RE(s) as both a supplier and a customer: 

THe intermediate network is naturally considered the more complex layer as all entities ('nodes') have connections 'in' and 'out', to other nodes in the intermediate network. Each RE node is (usually) also connected to the outer layers. By definition, all non-RE node in the intermediate network is not connected to the outer layer.

## Layout: high level node layout 
As alluded to above the highest level of 'groupings' in CURRENTS layout is to separate 'upstream suppliers' (start), the intermediate network (middle) and 'downstream customers' (end). Further groupings within the intermediate network can also be identified (detailed further below).

An 





## Layout: understanding flow  
ALl nodes are connected by links: these are represented by: 

- Outer layer links: represented by thin lines to/form the outer layer that run vertically, but have a curved section to direct them to intermediate nodes. These links have opacity, meaning that if there are multiple links between the same outer layer node an intermediate node, they will appear to be slightly darker. The node layout implies all out layer links have the supplier at the start (top) and customer at the end (bottom).


- Intermediate network links: represented by tapered shapes  The tapering indicates the direction of the link: from supplier (thick end) to customer (thin end). The starting thickness of these links are scaled, meaning that if there are multiple links between the same supplier and customer, they will appear to be thicker (at the supplier end). 

Most intermediate network links are rendered in a straight line, resulting in a shape of an elongated triangle. Nodes that have return links (coupled feedback) used a curved tapered links to ensure that the 'back and forth;' links do not overlap. This is a good visual indicator of feedback in the network. 

Critically, a (custom) layout algorithm has been applied that attempts to organise intermediate network links to follow the dominant supplier-to-customer direction of flow. Where possible, suppliers appear before (above) their customers in the 
intermediate network, so that most links are orientated towards the end (bottom) of the visualisaton.

Coupled nodes are on the same 'sort level', and any 'thrupled' nodes are place on the same level and in between their couple.

The second (and important) indicator of intermediate network/system feedback loops, is to look for intermediate links that 'go against the flow'. 




## Layout: node shape

### Layout: node shape

## Layout: node shape



## Flow matters



