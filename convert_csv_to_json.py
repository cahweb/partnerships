import csv
import json
import re

def parse_list_field(field):
    """Parse a field that contains list items separated by newlines or semicolons"""
    if not field or field.strip() == "":
        return []
    
    # Split by newlines first, then by semicolons if no newlines
    items = []
    if '\n' in field:
        items = [item.strip() for item in field.split('\n') if item.strip()]
    else:
        items = [item.strip() for item in field.split(';') if item.strip()]
    
    return items

def parse_degrees(degrees_field):
    """Parse degrees field and separate main programs from tracks"""
    if not degrees_field or degrees_field.strip() == "":
        return []
    
    degrees = []
    lines = [line.strip() for line in degrees_field.split('\n') if line.strip()]
    
    for line in lines:
        # Check if it's a track (contains "Track" at the end)
        if ': ' in line and 'Track' in line:
            # This is a degree with a track
            parts = line.split(': ')
            degree_name = parts[0].strip()
            track_name = parts[1].strip()
            
            # Find if we already have this degree
            existing_degree = None
            for d in degrees:
                if d['name'] == degree_name:
                    existing_degree = d
                    break
            
            if existing_degree:
                existing_degree['tracks'].append(track_name)
            else:
                degrees.append({
                    'name': degree_name,
                    'tracks': [track_name]
                })
        else:
            # Regular degree without tracks
            degrees.append({
                'name': line,
                'tracks': []
            })
    
    return degrees

def parse_highlights(highlights_field):
    """Parse highlights field to extract project names and URLs"""
    if not highlights_field or highlights_field.strip() == "":
        return []
    
    highlights = []
    lines = [line.strip() for line in highlights_field.split('\n') if line.strip()]
    
    for line in lines:
        if 'https://' in line:
            # Split on https:// to separate name and URL
            parts = line.split('https://')
            if len(parts) >= 2:
                name = parts[0].strip().rstrip(':').strip()
                url = 'https://' + parts[1].strip()
                highlights.append({
                    'name': name,
                    'url': url
                })
            else:
                highlights.append({'name': line, 'url': ''})
        else:
            highlights.append({'name': line, 'url': ''})
    
    return highlights

def convert_csv_to_json():
    departments = []
    
    with open('finaldata.csv', 'r', encoding='utf-8') as csvfile:
        # Use csv.DictReader to handle quoted fields properly
        reader = csv.DictReader(csvfile)
        
        for row in reader:
            # Skip empty rows
            if not any(row.values()):
                continue
                
            department_name = row['Schools/Departments'].strip()
            if not department_name:
                continue
            
            # Create department ID
            dept_id = department_name.lower().replace(' ', '-').replace('/', '-').replace('&', 'and')
            dept_id = re.sub(r'[^a-z0-9-]', '', dept_id)
            
            department = {
                'id': dept_id,
                'name': department_name,
                'degrees': parse_degrees(row['Degrees offered']),
                'internalPartners': parse_list_field(row['Internal Partners/Relationships']),
                'externalPartners': parse_list_field(row['External Partners/Relationships']),
                'highlights': parse_highlights(row['Highlights/Projects']),
                'techCourses': parse_list_field(row['Sampling of Tech Focused courses'])
            }
            
            departments.append(department)
    
    # Create the final JSON structure
    final_data = {
        'departments': departments
    }
    
    # Write to JSON file
    with open('finaldata.json', 'w', encoding='utf-8') as jsonfile:
        json.dump(final_data, jsonfile, indent=2, ensure_ascii=False)
    
    print(f"Successfully converted CSV to JSON. Created {len(departments)} departments.")
    
    # Print summary
    for dept in departments:
        print(f"- {dept['name']}: {len(dept['degrees'])} degrees, {len(dept['highlights'])} highlights")

if __name__ == "__main__":
    convert_csv_to_json()
