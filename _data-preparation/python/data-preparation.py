import pandas as pd
import json
import os

# ==== Configuration ====
report_year = 2024  # Set your desired year
excel_filename = 'WRRR Sector Data Input Model.xlsx'  # Your Excel file
sheet_names = [
    'node-master',         
    'link-upstream',    
    'link-downstream',
    'meta-link-question-map',
    'schema-essential-wrrr-services',
    'schema-rv-services',
    'schema-yn',
    'schema-frequency',
    'schema-resilience-options',
    'schema-geographic-dependency'
]


# ==== Derived paths ====
output_filename = f"data-{report_year}.js"
script_dir = os.path.dirname(os.path.abspath(__file__))
excel_path = os.path.join(script_dir, '..', 'spreadsheet', excel_filename)
output_path = os.path.join(script_dir, output_filename)


# ==== Helper: Try to parse JSON strings ====
def try_parse_json(val):
    if isinstance(val, str):
        val = val.strip()
        if (val.startswith('{') and val.endswith('}')) or (val.startswith('[') and val.endswith(']')):
            try:
                return json.loads(val)
            except json.JSONDecodeError:
                return val
    return val

# ==== Load and process sheets ====
excel_data = pd.read_excel(excel_path, sheet_name=sheet_names)

# Convert and clean data
json_data = {}
for sheet_name, df in excel_data.items():
    df = df.fillna('')
    parsed_rows = []
    for row in df.to_dict(orient='records'):
        parsed_row = {key: try_parse_json(value) for key, value in row.items()}
        parsed_rows.append(parsed_row)
    json_data[sheet_name] = parsed_rows

# ==== Export to JavaScript file ====
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(f"const data{report_year} = ")
    json.dump(json_data, f, indent=2, ensure_ascii=False)
    f.write(";")

print(f"Exported to {output_filename} with variable name: data{report_year}")
