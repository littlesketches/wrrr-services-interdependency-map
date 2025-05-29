# Data preparation materials

This folder contains assets and materials that can be used to prepare data in JavasScript (.js) files, that can be added to and used in the visualisation.

The "source data" used are a series of (pre-cleansed) data tables that are in separate tabs in  spreadsheet format.

There are two methods for generating the "data-20XX.js" data files

1. With a Python script from a Excel source data: this is the recommended way for DEECA to generate data files for each reporting year.

2. With a web page (tool/script) that connects to source data in a Google Sheet to either use the data directly, or to generate the .js data file. This is a more streamlined but requires the use of tools not approved by DEECA (Google Sheets and a local web server), so is used only in the development environment. 

As stated above, the purpose of either method is to take tabular source data from a spreadsheet, and to package and store that data in a "local file" (i.e. with the visualisation source code) that the visualisation can then access.


## Location/destination of prepared files
The final prepared data files for the tool are located:

/_static/js/data/by-reporting-year/
    - data-2024.js
    - data-2025.js
    - etc.


## Example files and templates

The template/example of a source data spreadsheet is located in the "../spreadsheet/" folder as ("source-data-template.xls"). 

This spreadsheet contains its own documentation regarding the data cleansing steps and structure of its tables. It contains anonymised data and is a copy of the documentation material created in May-June 2025 when this visualisation was developed.

In future years, DEECA may choose to store the actual data spreadsheets used for record keeping, in this folder.

Note: The Python script for extracting data from the source spreadsheet will need to correctly access the source data spreadsheet. For the extraction process, the script will expect the source data is in the same folder as the script file.
