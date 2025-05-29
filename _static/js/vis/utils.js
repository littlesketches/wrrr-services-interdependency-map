/**
 *  UTILITY FUNCTIONS 
 */


// Sorting arrays of objects
const sort = {
    mountainSort: (descendingArray) => {

        const result = [];
        let left = [];
        let right = [];

        //  Distribute elements around center
        for (let i = 0; i < descendingArray.length; i++) {
            if (i === 0) {
                result.push(descendingArray[i]); // highest rank in the center
            } else if (i % 2 === 1) {
                left.unshift(descendingArray[i]); // next highest to the left
            } else {
                right.push(descendingArray[i]); // next to the right
            }
        }

        return [...left, ...result, ...right];
    },
    valleySort: (ascendingArray) => {

        const result = [];
        let left = [];
        let right = [];

        // Distribute elements around the center (valley)
        for (let i = 0; i < ascendingArray.length; i++) {
            if (i === 0) {
                result.push(ascendingArray[i]); // smallest in the center
            } else if (i % 2 === 1) {
                left.unshift(ascendingArray[i]); // higher values to the left
            } else {
                right.push(ascendingArray[i]); // then to the right
            }
        }

        return [...left, ...result, ...right];
    }
}

const insert = {
    arrayInMiddle: (targetArray, insertArray) => {
        const middleIndex = Math.floor(targetArray.length / 2),
            result = [...targetArray];

        result.splice(middleIndex, 0, ...insertArray);
        // => Return 
        return result;
    }
}

// Join/merge arrays 
const join = {
    interleaveBalanced: (arr1, arr2) => {
        const longer = arr1.length > arr2.length ? arr1 : arr2,
            shorter = arr1.length < arr2.length ? arr1 : arr2

        const result = [];
        const totalSlots = longer.length + shorter.length;
        const interval = Math.floor(totalSlots / shorter.length); // spacing between inserts

        let i = 0; // index for longer
        let j = 0; // index for shorter

        for (let k = 0; k < totalSlots; k++) {
            if ((k % interval === interval - 1) && j < shorter.length) {
                result.push(shorter[j++]);
            } else if (i < longer.length) {
                result.push(longer[i++]);
            }
        }

        return result;
    },
    toOxfordList: (arr) => {
        if (arr.length <= 2) return arr.join(' and ');
        return arr.slice(0, -1).join(', ') + ', and ' + arr[arr.length - 1];
    }

}

// Text format
const format = {
}

// SVG
const svgText = {
    textWrap:function(text, width, lineHeight, centerVertical = false) {

        text.each(function() {
            let text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                y = text.attr("y"),
                x = text.attr("x"),
                fontSize = parseFloat(text.style("font-size")),
                dy = parseFloat(text.attr("dy")),
                tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));

                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan")
                        .attr("x", x)
                        .attr("y",  y)
                        .attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                }                    
            }            
            if(centerVertical){
                const translateY = lineNumber === 0 ? fontSize * 0.6 : - (lineNumber - 1) * 0.5 * fontSize
                text.style("transform",  `translateY(${translateY}px)`)
            }
        })
    } // end wrap()
}

const svgPath = {
    taperedStraightLink: (x1, y1, x2, y2, w1, w2) => {
        // Calculate length and direction vector from delta x and y
        const dx = x2 - x1,
            dy = y2 - y1,
            length = Math.sqrt(dx*dx + dy*dy);

        // Return undefined for zero length (i.e. internal loops)
        if(length === 0) return

        // Normalize and get perpendicular
        const px = -dy / length;
        const py = dx / length;

        // Start width offsets
        const x1l = x1 + px * w1 * 0.5,
             y1l = y1 + py * w1 * 0.5,
             x1r = x1 - px * w1 * 0.5,
             y1r = y1 - py * w1 * 0.5

        // End width offsets
        const x2l = x2 + px * w2 * 0.5,
            y2l = y2 + py * w2 * 0.5,
            x2r = x2 - px * w2 * 0.5,
            y2r = y2 - py * w2 * 0.5

        // Create SVG path
        const path =  `M ${x1l},${y1l} L ${x2l},${y2l} L ${x2r},${y2r} L ${x1r},${y1r} Z`;

        // => Return path
        return path
    },

    taperedArcLink(x1, y1, x2, y2, arcHeight, w1, w2, segments = 50) {
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        // Get vector from start to end
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);

        // Perpendicular vector (normal)
        const nx = -dy / len;
        const ny = dx / len;

        // Control point (for quadratic arc) is midpoint + arc height along normal
        const cx = midX + nx * arcHeight;
        const cy = midY + ny * arcHeight;

        const left = [];
        const right = [];

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;

            // Quadratic Bézier formula
            const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
            const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;

            // Derivative (tangent)
            const dxT = 2 * (1 - t) * (cx - x1) + 2 * t * (x2 - cx);
            const dyT = 2 * (1 - t) * (cy - y1) + 2 * t * (y2 - cy);

            const dLen = Math.sqrt(dxT * dxT + dyT * dyT);
            const tx = dxT / dLen;
            const ty = dyT / dLen;

            // Normal vector (perpendicular to tangent)
            const px = -ty;
            const py = tx;

            // Width at this point
            const width = w1 + (w2 - w1) * t;
            const halfW = width / 2;

            left.push(`${x + px * halfW},${y + py * halfW}`);
            right.push(`${x - px * halfW},${y - py * halfW}`);
        }

        // Construct SVG path
        const path = `M ${left[0]} ` +
            left.slice(1).map(p => `L ${p}`).join(" ") + " " +
            right.reverse().map(p => `L ${p}`).join(" ") + " Z";

        // => Return path
        return path;
    },

    triangle(x, y, r, pointing = 'up') {
        const startAngle = pointing === 'down' ? Math.PI / 2 : -Math.PI / 2; // 90° or -90°
        const points = d3.range(3).map(i => {
            const angle = startAngle + i * (2 * Math.PI / 3); // 120° apart
            return [
            x + r * Math.cos(angle),
            y + r * Math.sin(angle)
            ];
        })

        return `M${points[0]}L${points[1]}L${points[2]}Z`;
    }
}
