/**
 *  Data endpoint URLs
 *  ------------------
 *  - Using web-endpoint URLs is a convenient way to directly link data from spreadsheet tables to the visualisation. This may be useful in development/testing to see how changes in source data affect the visualisation
 *  - In 'production' the 'static-data-20XX' files will be used, with the option to 'switch' or use specific datasets (e.g. by year)
 *  - These endpoint URLs are taken from publishing data in Google Sheet [https://docs.google.com/spreadsheets/d/1BDJZ6_SKcLaO44NB6Mvp11FH6PYAuEdybDAaiZN-hIQ/]
 *  - Note:
 *      - GSheets can be 'private', however by enabling the publish option (to generate URl endpoints), data is (obviously then) technically 'publicly' available.    
 *      - Accordingly, it is recommended that only de-identified data is stored in GSheets.
 *      - Using the GSheet pipeline is however, is the most convenient way to generate the "static-data-20XX' files
 */ 

const endpointURL = {
    // Annual link data: non-RE nodes are extracted from this data
    'link-upstream':                    'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLvYWtRQIa5WAPfdjCzZfqxRIOcIkTXNLKuNKN_zUb14YPeoqrudZzzj80LM27rzE9fvhymohPyoKr/pub?gid=0&single=true&output=tsv',
    'link-downstream':                  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLvYWtRQIa5WAPfdjCzZfqxRIOcIkTXNLKuNKN_zUb14YPeoqrudZzzj80LM27rzE9fvhymohPyoKr/pub?gid=314375867&single=true&output=tsv',

    // 'Master' data: maintained and updated annually. Responsible Entity list/status must be updated as they are extracted from this table. for the reporting year. Non-REs expected to be updated on a semi-manual process
    'node-master':                      'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLvYWtRQIa5WAPfdjCzZfqxRIOcIkTXNLKuNKN_zUb14YPeoqrudZzzj80LM27rzE9fvhymohPyoKr/pub?gid=1949930480&single=true&output=tsv',

    // Schema and meta/config
    'meta-link-question-map':           'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLvYWtRQIa5WAPfdjCzZfqxRIOcIkTXNLKuNKN_zUb14YPeoqrudZzzj80LM27rzE9fvhymohPyoKr/pub?gid=1497294716&single=true&output=tsv',
    'schema-essential-waste-services':  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLvYWtRQIa5WAPfdjCzZfqxRIOcIkTXNLKuNKN_zUb14YPeoqrudZzzj80LM27rzE9fvhymohPyoKr/pub?gid=1541775027&single=true&output=tsv',
    'schema-services':                  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLvYWtRQIa5WAPfdjCzZfqxRIOcIkTXNLKuNKN_zUb14YPeoqrudZzzj80LM27rzE9fvhymohPyoKr/pub?gid=1793117292&single=true&output=tsv',
    'schema-yn':                        'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLvYWtRQIa5WAPfdjCzZfqxRIOcIkTXNLKuNKN_zUb14YPeoqrudZzzj80LM27rzE9fvhymohPyoKr/pub?gid=729906977&single=true&output=tsv',
    'schema-frequency':                 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLvYWtRQIa5WAPfdjCzZfqxRIOcIkTXNLKuNKN_zUb14YPeoqrudZzzj80LM27rzE9fvhymohPyoKr/pub?gid=1883807475&single=true&output=tsv',
    'schema-resilience-options':        'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLvYWtRQIa5WAPfdjCzZfqxRIOcIkTXNLKuNKN_zUb14YPeoqrudZzzj80LM27rzE9fvhymohPyoKr/pub?gid=136251750&single=true&output=tsv',
    'schema-geographic-dependency':     'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLvYWtRQIa5WAPfdjCzZfqxRIOcIkTXNLKuNKN_zUb14YPeoqrudZzzj80LM27rzE9fvhymohPyoKr/pub?gid=271412467&single=true&output=tsv',
}   


// Method to get data from endpoint URLs
async function getGSheetData(){
    console.log('Loading data from Google Sheet...')

    // Init data object to return
    const data = {}

    // Loop through endpoint object 
    for(const [tableId, url] of Object.entries(endpointURL)){
        // Use d3.tsv method to fetch data from URL as 'tsv' (tab separated values) text file and add retrieved data to data object
        data[tableId]  = await d3.tsv(url)  

        // Parse any strings that are JSON to JavaScript object (includes text > numbers and 'arrays as text string' to JS array ) 
        data[tableId].forEach( dataObj => {
            Object.entries(dataObj).forEach( ([key, value]) => {
                if(isJSON(value)){
                    dataObj[key] = JSON.parse(value)
                }
            })
        })
        // Debug log to console
        console.log(`- ${tableId} added...`)
    }

    // Return data object with all retrieved data       
    console.log(`*** All external data has been loaded added...`, data)  // Debug log to console
    return data
}


// Helper to test string for JSON validity
function isJSON(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}