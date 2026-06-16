import os
import re
import time
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Constants
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_DURATION = 600  # Cache for 10 minutes (in seconds)

# In-memory cache
_cache = {
    "data": None,
    "last_fetched": 0
}

def get_text_snippet(html_content, max_length=180):
    """Clean HTML tags and return a short plain text snippet."""
    text = re.sub(r'<[^<]+?>', '', html_content)
    text = ' '.join(text.split())
    if len(text) > max_length:
        return text[:max_length] + '...'
    return text

def parse_stage(html_content, item_type):
    """Determine the launch stage of a release item based on its content."""
    html_lower = html_content.lower()
    
    if "deprecated" in item_type.lower() or "deprecated" in html_lower:
        return "Deprecated"
    elif "preview" in html_lower:
        return "Preview"
    elif "generally available" in html_lower or " ga " in html_lower or "(ga)" in html_lower or " ga." in html_lower:
        return "GA"
    elif "beta" in html_lower:
        return "Beta"
    
    # Default fallback
    return "GA" if item_type != "Issue" else "N/A"

def fetch_and_parse_feed(force_refresh=False):
    """Fetch XML from feed and parse it into structured items."""
    global _cache
    current_time = time.time()
    
    # Check if we have valid cache
    if not force_refresh and _cache["data"] and (current_time - _cache["last_fetched"] < CACHE_DURATION):
        print("Returning cached release notes data")
        return _cache["data"]
    
    print("Fetching fresh feed data...")
    try:
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BigQueryReleaseNotesViewer/1.0'}
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_data = response.read()
        
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        feed_title = root.find('atom:title', ns)
        feed_title_text = feed_title.text if feed_title is not None else "BigQuery - Release notes"
        
        feed_updated = root.find('atom:updated', ns)
        feed_updated_text = feed_updated.text if feed_updated is not None else ""
        
        entries = root.findall('atom:entry', ns)
        
        parsed_items = []
        for index, entry in enumerate(entries):
            entry_id_elem = entry.find('atom:id', ns)
            entry_id = entry_id_elem.text if entry_id_elem is not None else f"entry-{index}"
            
            date_str = entry.find('atom:title', ns).text
            updated_str = entry.find('atom:updated', ns).text
            content_html = entry.find('atom:content', ns).text
            
            # Split the content by <h3> tags
            parts = re.split(r'<h3>', content_html, flags=re.IGNORECASE)
            
            item_index = 0
            for part in parts:
                if not part.strip():
                    continue
                subparts = part.split('</h3>', 1)
                if len(subparts) == 2:
                    item_type = subparts[0].strip()
                    item_html = subparts[1].strip()
                    
                    stage = parse_stage(item_html, item_type)
                    snippet = get_text_snippet(item_html)
                    
                    parsed_items.append({
                        "id": f"{entry_id}-item-{item_index}",
                        "date": date_str,
                        "updated": updated_str,
                        "type": item_type,
                        "stage": stage,
                        "content": item_html,
                        "snippet": snippet
                    })
                    item_index += 1
                    
        result = {
            "feed_title": feed_title_text,
            "feed_updated": feed_updated_text,
            "total_items": len(parsed_items),
            "items": parsed_items,
            "cached_at": current_time
        }
        
        # Save to cache
        _cache["data"] = result
        _cache["last_fetched"] = current_time
        return result
        
    except Exception as e:
        print(f"Error fetching/parsing feed: {e}")
        # If fetch fails but we have stale cache, return stale cache as fallback
        if _cache["data"]:
            print("Returning stale cache due to fetch error")
            return _cache["data"]
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        force = request.args.get('refresh') == 'true'
        data = fetch_and_parse_feed(force_refresh=force)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/stats')
def get_stats():
    try:
        force = request.args.get('refresh') == 'true'
        data = fetch_and_parse_feed(force_refresh=force)
        items = data["items"]
        
        # Count by type
        types = {}
        for item in items:
            t = item["type"]
            types[t] = types.get(t, 0) + 1
            
        # Count by stage
        stages = {}
        for item in items:
            s = item["stage"]
            stages[s] = stages.get(s, 0) + 1
            
        # Group by month (for timeline chart)
        timeline = {}
        # Date format: e.g. "June 15, 2026"
        # We can extract Month and Year
        for item in items:
            date_str = item["date"]
            # Try to match Month Year
            match = re.search(r'([A-Za-z]+)\s+\d+,\s+(\d{4})', date_str)
            if match:
                month_year = f"{match.group(1)} {match.group(2)}"
                timeline[month_year] = timeline.get(month_year, 0) + 1
            else:
                timeline["Other"] = timeline.get("Other", 0) + 1
                
        # Format timeline as a list of dicts sorted chronologically (rough sort since we have month names)
        # To do proper chronological sorting, we map month names to numbers
        month_map = {
            "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
            "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12
        }
        
        def sort_key(item):
            parts = item[0].split()
            if len(parts) == 2:
                m, y = parts[0], parts[1]
                return int(y), month_map.get(m, 0)
            return 9999, 0
            
        sorted_timeline = [{"period": k, "count": v} for k, v in sorted(timeline.items(), key=sort_key)]
        
        return jsonify({
            "total_items": len(items),
            "types": [{"name": k, "count": v} for k, v in types.items()],
            "stages": [{"name": k, "count": v} for k, v in stages.items()],
            "timeline": sorted_timeline
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
