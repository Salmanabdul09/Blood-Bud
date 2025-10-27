from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import google.generativeai as genai 
import pandas as pd
import os
import pdfplumber
import csv
import json
import sys

# Function to print debug info to stderr instead of stdout
def debug_print(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

# Check if running as a script with arguments
if len(sys.argv) > 1:
    # Get the PDF path from command line arguments
    pdf_path = sys.argv[1]
    # Check if user information is provided
    user_info = None
    if len(sys.argv) > 2:
        try:
            user_info = json.loads(sys.argv[2])
            debug_print(f"User info received: {user_info}")
        except Exception as e:
            debug_print(f"Error parsing user info: {e}")
    standalone_mode = True
else:
    standalone_mode = False

app = Flask(__name__)
cors = CORS(app)


@app.route('/upload', methods=['POST'])
def upload_file():
    if request.method == 'POST':
        # Check if a file was uploaded
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        
        # Save the uploaded file
        pdf_path = os.path.join("public/uploads", file.filename)
        file.save(pdf_path)
        
        # Process the file
        csv_path = pdf_path.replace('.pdf', '.csv')
        pdf_to_csv(pdf_path, csv_path)
        
        # Get user information if provided
        user_info = None
        if 'user_info' in request.form:
            try:
                user_info = json.loads(request.form['user_info'])
            except Exception as e:
                debug_print(f"Error parsing user info: {e}")
        
        # Analyze the data
        result = analyze_bloodwork(csv_path, user_info)
        json_string = json.dumps(result)
        debug_print(json_string)
        return jsonify({"message": result}), 200


def extract_text_from_pdf(pdf_path):
    """Extracts text from a PDF file."""
    text_data = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    # Clean up the text - replace problematic characters
                    text = text.replace('', '-')  # Replace unknown bytes with hyphens
                    text = text.replace('\u2013', '-')  # Replace en dash
                    text = text.replace('\u2014', '-')  # Replace em dash
                    text = text.replace('\u2018', "'")  # Replace left single quote
                    text = text.replace('\u2019', "'")  # Replace right single quote
                    text = text.replace('\u201c', '"')  # Replace left double quote
                    text = text.replace('\u201d', '"')  # Replace right double quote
                    text_data.append(text)
        
        # Print the extracted text for debugging
        debug_print("===== EXTRACTED TEXT START =====")
        debug_print("\n".join(text_data))
        debug_print("===== EXTRACTED TEXT END =====")
        
        return "\n".join(text_data)
    except Exception as e:
        debug_print(f"Error extracting text from PDF: {e}")
        return ""

def parse_bloodwork_data(text):
    """Parses extracted text into structured bloodwork data."""
    lines = text.split("\n")
    data = []
    
    # Print the lines for debugging
    debug_print("===== PARSING LINES START =====")
    for i, line in enumerate(lines):
        debug_print(f"Line {i}: {line}")
    debug_print("===== PARSING LINES END =====")
    
    for line in lines:
        # Skip empty lines
        if not line.strip():
            continue
            
        # Try to identify blood test result lines
        # Most blood test results follow a pattern: Test Name, Value, Units, Reference Range
        parts = line.split()
        
        if len(parts) >= 3:  
            # Check if this looks like a blood test result line
            # Usually has numbers and units like g/dL, mg/dL, etc.
            has_units = any(unit in line for unit in ['g/dL', 'mg/dL', 'mmol/L', 'U/L', 'ng/mL', 'μIU/mL', 'x10^3', '%'])
            has_numbers = any(char.isdigit() for char in line)
            
            if has_numbers and (has_units or '-' in line or 'normal' in line.lower()):
                # This is likely a test result line
                # Extract test name (everything before the first number)
                test_parts = []
                value_parts = []
                
                # Split into test name and value parts
                numeric_found = False
                for part in parts:
                    if not numeric_found and not any(char.isdigit() for char in part):
                        test_parts.append(part)
                    else:
                        numeric_found = True
                        value_parts.append(part)
                
                # If we couldn't split properly, use a simpler approach
                if not test_parts or not value_parts:
                    if len(parts) >= 2:
                        test_name = " ".join(parts[:-1])
                        test_value = parts[-1]
                    else:
                        continue
                else:
                    test_name = " ".join(test_parts)
                    test_value = " ".join(value_parts)
                
                data.append([test_name, test_value])
    
    # Print the parsed data for debugging
    debug_print("===== PARSED DATA START =====")
    for item in data:
        debug_print(item)
    debug_print("===== PARSED DATA END =====")
    
    return data

def save_to_csv(data, output_csv):
    """Saves extracted bloodwork data to a CSV file."""
    try:
        with open(output_csv, "w", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            writer.writerow(["Test Name", "Value", "Units", "Reference Range"])
            
            for row in data:
                test_name = row[0]
                value_parts = row[1].split() if len(row) > 1 else [""]
                
                # Try to separate value, units, and reference range
                value = ""
                units = ""
                ref_range = ""
                
                if len(value_parts) >= 1:
                    # First part is usually the value
                    value = value_parts[0]
                
                if len(value_parts) >= 2:
                    # Second part might be units
                    units = value_parts[1]
                
                # Check if there's a reference range (often contains a dash)
                for i, part in enumerate(value_parts):
                    if '-' in part and i > 0:
                        ref_range = ' '.join(value_parts[i:])
                        if i > 1:  # If we found ref range and there are units
                            units = ' '.join(value_parts[1:i])
                        break
                
                writer.writerow([test_name, value, units, ref_range])
        
        # Print the CSV path for debugging
        debug_print(f"CSV file saved to: {output_csv}")
        
        # Try to read back the CSV to verify
        try:
            df = pd.read_csv(output_csv)
            debug_print("===== CSV CONTENT START =====")
            debug_print(df.to_string())
            debug_print("===== CSV CONTENT END =====")
        except Exception as e:
            debug_print(f"Error reading back CSV: {e}")
            
    except Exception as e:
        debug_print(f"Error saving to CSV: {e}")
        # Create a minimal CSV if there was an error
        with open(output_csv, "w", newline="") as file:
            writer = csv.writer(file)
            writer.writerow(["Test Name", "Value"])
            for row in data:
                writer.writerow([row[0], row[1] if len(row) > 1 else ""])

def pdf_to_csv(pdf_path, output_csv):
    """Complete pipeline: Extract, Parse, and Save bloodwork data."""
    text = extract_text_from_pdf(pdf_path)
    structured_data = parse_bloodwork_data(text)
    save_to_csv(structured_data, output_csv)

# Set up Google API key
os.environ["GOOGLE_API_KEY"] ="AIzaSyAxfVaweEcTVsIXiqlP7Vq356bb8h2ogqE"
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

def analyze_bloodwork(file_path, user_info=None):
    try:
        # Read the CSV file
        df = pd.read_csv(file_path)

        # Print the dataframe for debugging
        debug_print("===== DATAFRAME START =====")
        debug_print(df.head())
        debug_print("===== DATAFRAME END =====")
        
        # Format the bloodwork data for the prompt
        if 'Units' in df.columns and 'Reference Range' in df.columns:
            # Use the enhanced CSV format
            bloodwork_text = ""
            for _, row in df.iterrows():
                test_name = row['Test Name']
                value = row['Value']
                units = row['Units'] if not pd.isna(row['Units']) else ""
                ref_range = row['Reference Range'] if not pd.isna(row['Reference Range']) else ""
                
                line = f"{test_name}: {value} {units}"
                if ref_range:
                    line += f" (Reference Range: {ref_range})"
                bloodwork_text += line + "\n"
        else:
            # Use the simple format
            bloodwork_text = df.to_string(index=False)
        
        # Format user information if available
        user_info_text = ""
        if user_info and isinstance(user_info, dict):
            debug_print(f"Including user info in prompt: {user_info}")
            
            if 'age' in user_info and user_info['age']:
                user_info_text += f"Patient Age: {user_info['age']} years\n"
            
            if 'gender' in user_info and user_info['gender']:
                user_info_text += f"Patient Gender: {user_info['gender']}\n"
            
            if 'diseases' in user_info and user_info['diseases']:
                user_info_text += f"Patient Medical History: {user_info['diseases']}\n"
            
            if user_info_text:
                user_info_text = "Patient Information:\n" + user_info_text + "\n"

        prompt = f"""
        You are an AI-powered medical assistant analyzing blood test results.
        
        Instructions:
        Provide clear and actionable health recommendations based on the test results.
        Present the blood test results in a structured breakdown with:
        Test Name
        Result
        Reference Range
        Notes (explanation, significance, and possible concerns)
        If age, gender, or health conditions are provided, tailor your recommendations accordingly. In your summary, if anything corresponds to the patient's medical history, make sure to mention it.
        
        {user_info_text}
        Blood Test Results:
        {bloodwork_text}

        Expected Output Format:

        Summary:
        **Summarize key takeaways** in simple language, mentioning:
       - Any potential concerns or abnormalities
       - Possible causes
       - Suggestions for lifestyle changes or further testing

        Recommendations:

        [Actionable suggestion 1]
        [Actionable suggestion 2]
        [Etc.]
        Blood Test Breakdown:

        Test Name	| Result	| Reference Range	| Notes
        
        Ensure your response is clear, concise, and medically informative. If age, gender, or health conditions are provided, tailor your recommendations accordingly. Avoid making definitive diagnoses and always suggest consulting a healthcare provider if needed.
        """

        model = genai.GenerativeModel("gemini-1.5-pro")
        response = model.generate_content(prompt)
        
        # Print the full response to console for debugging
        debug_print("===== MODEL RESPONSE START =====")
        debug_print(response.text)
        debug_print("===== MODEL RESPONSE END =====")
        
        return response.text
    except Exception as e:
        debug_print(f"Error analyzing bloodwork: {e}")
        return f"Error analyzing bloodwork: {str(e)}"

# If running as a standalone script
if standalone_mode:
    try:
        # Process the PDF file
        csv_path = pdf_path.replace('.pdf', '.csv')
        pdf_to_csv(pdf_path, csv_path)
        
        # Analyze the data
        result = analyze_bloodwork(csv_path, user_info)
        
        # Print ONLY the JSON result to stdout for the Node.js process to capture
        # Everything else goes to stderr
        print(json.dumps({"analysis": result}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
    sys.exit(0)

if __name__ == "__main__" and not standalone_mode:
    app.run(debug=True)
