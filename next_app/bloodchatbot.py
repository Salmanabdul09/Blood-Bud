import google.generativeai as genai
import os
import sys
import json
import re

# Set API key - ensure it's properly set
api_key = "AIzaSyAxfVaweEcTVsIXiqlP7Vq356bb8h2ogqE"

os.environ["GOOGLE_API_KEY"] = api_key

# Configure the API with the key
genai.configure(api_key=api_key)

def process_input_file(file_path):
    try:
        # Read the input file with explicit encoding
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Parse the content to extract test analysis and conversation
        parts = content.split('\n\n', 1)
        
        test_analysis = ""
        conversation = ""
        
        if len(parts) >= 1:
            test_analysis_line = parts[0]
            if test_analysis_line.startswith("TEST_ANALYSIS:"):
                test_analysis = test_analysis_line[len("TEST_ANALYSIS:"):].strip()
        
        if len(parts) >= 2:
            conversation = parts[1]
        
        # Extract the last user message
        user_messages = [line for line in conversation.split('\n') if line.startswith("User:")]
        last_user_message = ""
        
        if user_messages:
            last_user_message = user_messages[-1][len("User:"):].strip()
        
        return test_analysis, conversation, last_user_message
    except Exception as e:
        print(f"Error processing input file: {str(e)}", file=sys.stderr)
        return "", "", ""

def extract_test_values(test_analysis):
    """Extract all test values from the test analysis text"""
    test_info = {}
    
    # Common test patterns
    test_patterns = {
        "glucose": [r'glucose\s+is\s+(\d+(?:\.\d+)?)', r'blood\s+sugar\s+is\s+(\d+(?:\.\d+)?)'],
        "bun": [r'bun\s+is\s+(\d+(?:\.\d+)?)', r'blood\s+urea\s+nitrogen\s+is\s+(\d+(?:\.\d+)?)'],
        "creatinine": [r'creatinine\s+is\s+(\d+(?:\.\d+)?)'],
        "egfr": [r'egfr\s+is\s+(\d+(?:\.\d+)?)', r'estimated\s+glomerular\s+filtration\s+rate\s+is\s+(\d+(?:\.\d+)?)'],
        "alt": [r'alt\s+is\s+(\d+(?:\.\d+)?)', r'alanine\s+aminotransferase\s+is\s+(\d+(?:\.\d+)?)'],
        "ast": [r'ast\s+is\s+(\d+(?:\.\d+)?)', r'aspartate\s+aminotransferase\s+is\s+(\d+(?:\.\d+)?)'],
        "wbc": [r'wbc\s+is\s+(\d+(?:\.\d+)?)', r'white\s+blood\s+cells?\s+(?:count\s+)?is\s+(\d+(?:\.\d+)?)'],
        "rbc": [r'rbc\s+is\s+(\d+(?:\.\d+)?)', r'red\s+blood\s+cells?\s+(?:count\s+)?is\s+(\d+(?:\.\d+)?)'],
        "hemoglobin": [r'h(?:emo)?globin\s+is\s+(\d+(?:\.\d+)?)', r'hgb\s+is\s+(\d+(?:\.\d+)?)'],
        "hematocrit": [r'hematocrit\s+is\s+(\d+(?:\.\d+)?)', r'hct\s+is\s+(\d+(?:\.\d+)?)'],
        "platelets": [r'platelets\s+(?:count\s+)?is\s+(\d+(?:\.\d+)?)'],
        "cholesterol": [r'cholesterol\s+is\s+(\d+(?:\.\d+)?)', r'total\s+cholesterol\s+is\s+(\d+(?:\.\d+)?)'],
        "hdl": [r'hdl\s+is\s+(\d+(?:\.\d+)?)', r'high\s+density\s+lipoprotein\s+is\s+(\d+(?:\.\d+)?)'],
        "ldl": [r'ldl\s+is\s+(\d+(?:\.\d+)?)', r'low\s+density\s+lipoprotein\s+is\s+(\d+(?:\.\d+)?)'],
        "triglycerides": [r'triglycerides\s+is\s+(\d+(?:\.\d+)?)'],
        "a1c": [r'a1c\s+is\s+(\d+(?:\.\d+)?)', r'hba1c\s+is\s+(\d+(?:\.\d+)?)', r'hemoglobin\s+a1c\s+is\s+(\d+(?:\.\d+)?)'],
        "tsh": [r'tsh\s+is\s+(\d+(?:\.\d+)?)', r'thyroid\s+stimulating\s+hormone\s+is\s+(\d+(?:\.\d+)?)'],
        "vitamin d": [r'vitamin\s+d\s+is\s+(\d+(?:\.\d+)?)', r'25-hydroxyvitamin\s+d\s+is\s+(\d+(?:\.\d+)?)'],
        "iron": [r'iron\s+is\s+(\d+(?:\.\d+)?)']
    }
    
    # Extract values using patterns
    for test, patterns in test_patterns.items():
        for pattern in patterns:
            match = re.search(pattern, test_analysis.lower())
            if match:
                test_info[test] = float(match.group(1))
                break
    
    # If patterns don't match, try to find numbers near test names
    if not test_info:
        words = test_analysis.split()
        for i, word in enumerate(words):
            if word.lower() in test_patterns and i+1 < len(words) and words[i+1].replace('.', '', 1).isdigit():
                test_info[word.lower()] = float(words[i+1])
    
    return test_info

def generate_test_summary(test_info):
    """Generate a summary of all test results"""
    if not test_info:
        return "I don't see any specific test values in the information provided. Please share your test results or ask about a specific test."
    
    summary = "Here's a summary of your test results:\n\n"
    
    # Reference ranges and interpretations
    reference_ranges = {
        "glucose": {
            "range": "70-99 mg/dL (fasting)",
            "low": "below 70 mg/dL - hypoglycemia (low blood sugar)",
            "normal": "70-99 mg/dL - normal fasting glucose",
            "high_1": "100-125 mg/dL - prediabetes (when fasting)",
            "high_2": "126 mg/dL or higher - may indicate diabetes (when fasting)"
        },
        "bun": {
            "range": "7-20 mg/dL",
            "low": "below 7 mg/dL - may indicate liver disease, malnutrition, or overhydration",
            "normal": "7-20 mg/dL - normal kidney function",
            "high": "above 20 mg/dL - may indicate reduced kidney function, dehydration, or high protein diet"
        },
        "creatinine": {
            "range": "0.7-1.3 mg/dL (men), 0.6-1.1 mg/dL (women)",
            "low": "below range - may indicate decreased muscle mass",
            "normal": "within range - normal kidney function",
            "high": "above range - may indicate kidney problems"
        },
        "cholesterol": {
            "range": "below 200 mg/dL",
            "normal": "below 200 mg/dL - desirable",
            "high_1": "200-239 mg/dL - borderline high",
            "high_2": "240 mg/dL or higher - high"
        },
        "hdl": {
            "range": "above 40 mg/dL (men), above 50 mg/dL (women)",
            "low": "below range - increased heart disease risk",
            "normal": "within range - acceptable",
            "high": "60 mg/dL or higher - considered protective against heart disease"
        },
        "ldl": {
            "range": "below 100 mg/dL",
            "normal": "below 100 mg/dL - optimal",
            "high_1": "100-129 mg/dL - near optimal",
            "high_2": "130-159 mg/dL - borderline high",
            "high_3": "160-189 mg/dL - high",
            "high_4": "190 mg/dL or higher - very high"
        },
        "triglycerides": {
            "range": "below 150 mg/dL",
            "normal": "below 150 mg/dL - normal",
            "high_1": "150-199 mg/dL - borderline high",
            "high_2": "200-499 mg/dL - high",
            "high_3": "500 mg/dL or higher - very high"
        }
    }
    
    # Add each test result to the summary
    for test, value in test_info.items():
        summary += f"• {test.upper()}: {value} "
        
        if test in reference_ranges:
            summary += f"({reference_ranges[test]['range']})\n"
            
            # Add interpretation based on value
            if test == "glucose":
                if value < 70:
                    summary += f"  - {reference_ranges[test]['low']}\n"
                elif 70 <= value <= 99:
                    summary += f"  - {reference_ranges[test]['normal']}\n"
                elif 100 <= value <= 125:
                    summary += f"  - {reference_ranges[test]['high_1']}\n"
                else:
                    summary += f"  - {reference_ranges[test]['high_2']}\n"
            elif test == "bun":
                if value < 7:
                    summary += f"  - {reference_ranges[test]['low']}\n"
                elif 7 <= value <= 20:
                    summary += f"  - {reference_ranges[test]['normal']}\n"
                else:
                    summary += f"  - {reference_ranges[test]['high']}\n"
            elif test == "creatinine":
                # Using general range without gender specificity
                if value < 0.6:
                    summary += f"  - {reference_ranges[test]['low']}\n"
                elif 0.6 <= value <= 1.3:
                    summary += f"  - {reference_ranges[test]['normal']}\n"
                else:
                    summary += f"  - {reference_ranges[test]['high']}\n"
            elif test == "cholesterol":
                if value < 200:
                    summary += f"  - {reference_ranges[test]['normal']}\n"
                elif 200 <= value <= 239:
                    summary += f"  - {reference_ranges[test]['high_1']}\n"
                else:
                    summary += f"  - {reference_ranges[test]['high_2']}\n"
        else:
            summary += "(no reference range available)\n"
    
    summary += "\nWould you like more detailed information about any specific test?"
    return summary

def generate_mock_response(test_analysis, user_input):
    """Generate a mock response based on the test analysis and user input"""
    # Extract all test values
    test_info = extract_test_values(test_analysis)
    
    # Check if user is asking for a general summary of results
    general_summary_patterns = [
        r'tell me about my (?:test )?results',
        r'explain my (?:test )?results',
        r'what do my (?:test )?results mean',
        r'summarize my (?:test )?results',
        r'overview of my (?:test )?results',
        r'interpret my (?:test )?results'
    ]
    
    for pattern in general_summary_patterns:
        if re.search(pattern, user_input.lower()):
            return generate_test_summary(test_info)
    
    # Check if the user is asking about BUN
    if "bun" in user_input.lower() or "blood urea nitrogen" in user_input.lower():
        if "bun" in test_info:
            bun = test_info["bun"]
            if bun < 7:
                return f"Your BUN (Blood Urea Nitrogen) level of {bun} mg/dL is below the normal range (7-20 mg/dL). Low BUN can be associated with liver disease, malnutrition, or overhydration. Please consult with your healthcare provider for proper interpretation."
            elif 7 <= bun <= 20:
                return f"Your BUN (Blood Urea Nitrogen) level of {bun} mg/dL is within the normal range (7-20 mg/dL). BUN is a measure of kidney function and protein metabolism. A normal level suggests your kidneys are filtering waste products effectively."
            else:
                return f"Your BUN (Blood Urea Nitrogen) level of {bun} mg/dL is above the normal range (7-20 mg/dL). Elevated BUN can indicate reduced kidney function, dehydration, high protein diet, or certain medications. I recommend discussing this with your healthcare provider."
        else:
            return "BUN (Blood Urea Nitrogen) is a blood test that measures the amount of urea nitrogen in your blood. Urea is a waste product formed in the liver when protein is broken down. BUN is primarily used to evaluate kidney function. The normal range for adults is typically 7-20 mg/dL. If you have your specific BUN value, I can provide a more personalized interpretation."
    
    # Generate response based on available test info for glucose
    if "glucose" in test_info:
        glucose = test_info["glucose"]
        if "glucose" in user_input.lower() or "sugar" in user_input.lower():
            if glucose < 70:
                return f"Your blood glucose level of {glucose} mg/dL is below the normal range (70-99 mg/dL when fasting). This is considered hypoglycemia (low blood sugar). You should consult with your healthcare provider as this may require immediate attention."
            elif 70 <= glucose <= 99:
                return f"Your blood glucose level of {glucose} mg/dL is within the normal fasting range (70-99 mg/dL). This suggests your blood sugar is well-controlled."
            elif 100 <= glucose <= 125:
                return f"Your blood glucose level of {glucose} mg/dL is in the prediabetic range (100-125 mg/dL when fasting). This suggests you may have prediabetes, a condition where blood sugar is higher than normal but not high enough to be diagnosed as diabetes. I recommend discussing this with your healthcare provider."
            else:
                return f"Your blood glucose level of {glucose} mg/dL is above the normal range and may indicate diabetes (≥126 mg/dL when fasting). I recommend consulting with your healthcare provider for proper diagnosis and treatment."
    
    # Check for cholesterol questions
    if "cholesterol" in user_input.lower() and "cholesterol" in test_info:
        cholesterol = test_info["cholesterol"]
        if cholesterol < 200:
            return f"Your total cholesterol level of {cholesterol} mg/dL is within the desirable range (below 200 mg/dL). This is good for your heart health."
        elif 200 <= cholesterol <= 239:
            return f"Your total cholesterol level of {cholesterol} mg/dL is borderline high (200-239 mg/dL). Consider lifestyle changes like diet and exercise to lower it."
        else:
            return f"Your total cholesterol level of {cholesterol} mg/dL is high (240 mg/dL or higher). This increases your risk for heart disease and stroke. I recommend discussing treatment options with your healthcare provider."
    
    # Check for creatinine questions
    if "creatinine" in user_input.lower() and "creatinine" in test_info:
        creatinine = test_info["creatinine"]
        if creatinine < 0.6:
            return f"Your creatinine level of {creatinine} mg/dL is below the typical range. Low creatinine can be associated with decreased muscle mass or sometimes liver disease. Please consult with your healthcare provider for proper interpretation."
        elif 0.6 <= creatinine <= 1.3:
            return f"Your creatinine level of {creatinine} mg/dL is within the normal range (0.6-1.3 mg/dL). Creatinine is a waste product from muscle metabolism that's filtered by your kidneys. A normal level suggests your kidneys are functioning properly."
        else:
            return f"Your creatinine level of {creatinine} mg/dL is above the normal range. Elevated creatinine can indicate kidney problems, as it suggests your kidneys aren't filtering waste effectively. I recommend discussing this with your healthcare provider."
    
    # Common blood test explanations
    blood_test_explanations = {
        "bun": "BUN (Blood Urea Nitrogen) is a waste product formed in the liver when protein is broken down. It's filtered out of your blood by your kidneys, so BUN levels reflect both liver and kidney function. Normal range is typically 7-20 mg/dL for adults.",
        
        "creatinine": "Creatinine is a waste product from the normal breakdown of muscle tissue. As creatinine is produced, it's filtered through the kidneys and excreted in urine. Measuring creatinine is a useful way to evaluate kidney function. Normal range is typically 0.7-1.3 mg/dL for men and 0.6-1.1 mg/dL for women.",
        
        "egfr": "eGFR (estimated Glomerular Filtration Rate) is a calculation based on your creatinine level, age, body size, and gender that determines how well your kidneys are filtering. Normal eGFR is 90 or higher, with lower values indicating decreased kidney function.",
        
        "alt": "ALT (Alanine Aminotransferase) is an enzyme found primarily in the liver. Elevated levels may indicate liver damage or disease. Normal range is typically 7-56 units/L for men and 7-45 units/L for women.",
        
        "ast": "AST (Aspartate Aminotransferase) is an enzyme found in the liver, heart, and muscles. Elevated levels may indicate damage to these organs. Normal range is typically 8-48 units/L for men and 7-42 units/L for women.",
        
        "wbc": "WBC (White Blood Cell) count measures the number of white blood cells in your blood, which fight infection. Normal range is typically 4,500-11,000 cells/mcL. High levels may indicate infection or inflammation, while low levels may suggest bone marrow problems or certain medications.",
        
        "rbc": "RBC (Red Blood Cell) count measures the number of red blood cells in your blood, which carry oxygen. Normal range is typically 4.5-5.9 million cells/mcL for men and 4.1-5.1 million cells/mcL for women. Abnormal levels may indicate anemia or other conditions.",
        
        "hemoglobin": "Hemoglobin is the protein in red blood cells that carries oxygen. Normal range is typically 13.5-17.5 g/dL for men and 12.0-15.5 g/dL for women. Low levels may indicate anemia, while high levels may suggest other conditions.",
        
        "hematocrit": "Hematocrit is the percentage of your blood that is made up of red blood cells. Normal range is typically 38.8-50% for men and 34.9-44.5% for women. Abnormal levels may indicate dehydration, anemia, or other conditions.",
        
        "platelets": "Platelets are cell fragments that help your blood clot. Normal range is typically 150,000-450,000 platelets/mcL. Low levels may increase bleeding risk, while high levels may increase clotting risk.",
        
        "cholesterol": "Cholesterol is a fatty substance in your blood. Total cholesterol should ideally be below 200 mg/dL. High levels may increase risk of heart disease.",
        
        "hdl": "HDL (High-Density Lipoprotein) is often called 'good cholesterol' as it helps remove other forms of cholesterol from your bloodstream. Higher levels (>60 mg/dL) are better and may protect against heart disease.",
        
        "ldl": "LDL (Low-Density Lipoprotein) is often called 'bad cholesterol' as it can build up in your arteries. Lower levels (<100 mg/dL) are better to reduce heart disease risk.",
        
        "triglycerides": "Triglycerides are a type of fat in your blood. Normal levels are <150 mg/dL. High levels may increase risk of heart disease and may be associated with diabetes or metabolic syndrome.",
        
        "a1c": "HbA1c or A1C measures your average blood sugar level over the past 2-3 months. Normal is <5.7%, prediabetes is 5.7-6.4%, and diabetes is ≥6.5%.",
        
        "tsh": "TSH (Thyroid Stimulating Hormone) is produced by the pituitary gland and regulates thyroid function. Normal range is typically 0.4-4.0 mIU/L. Abnormal levels may indicate thyroid disorders.",
        
        "vitamin d": "Vitamin D is important for bone health and immune function. Normal levels are typically 20-50 ng/mL. Low levels may lead to bone problems and are associated with various health conditions.",
        
        "iron": "Iron is essential for red blood cell production. Normal range varies by gender, with men typically having 65-175 μg/dL and women 50-170 μg/dL. Abnormal levels may indicate anemia or iron overload."
    }
    
    # Check if user is asking about a specific test
    for test, explanation in blood_test_explanations.items():
        if test in user_input.lower():
            return explanation
    
    # Default responses for common questions
    if "what" in user_input.lower() and "mean" in user_input.lower():
        return "Based on the test analysis provided, I can see some values from your bloodwork. To give you a more specific interpretation, could you ask about a particular test or value you're concerned about?"
    
    if "normal" in user_input.lower():
        return "Normal ranges for blood tests vary depending on the specific test, your age, gender, and the laboratory that performed the test. The test results typically indicate the reference range next to your result. If you're asking about a specific test, please mention which one you're interested in."
    
    # Default response
    return "I'm here to help you understand your blood test results. Based on the information provided, I can see some basic test data. If you have specific questions about particular values or tests, please let me know which ones you're interested in."

def generate_response(test_analysis, conversation, user_input):
    try:
        # First try to use the Gemini 1.5 Flash model
        print(f"Attempting to use Gemini 1.5 Flash model first...", file=sys.stderr)
        
        # Create the prompt for the AI
        prompt = f"""
        You are a helpful medical assistant chatbot that can answer questions about blood test results.
        You should provide accurate, helpful information based on the blood test analysis provided.
        Be conversational and friendly, but professional. If you don't know something, admit it.
        Keep your responses concise and focused on the user's question.
        
        Blood Test Analysis:
        {test_analysis}
        
        Previous conversation:
        {conversation}
        
        User: {user_input}
        AI:
        """
        
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            print(f"Successfully used Gemini 1.5 Flash model", file=sys.stderr)
            print(f"Gemini response: {response.text[:100]}...", file=sys.stderr)
            return "[Gemini 1.5 Flash] " + response.text
        except Exception as e:
            print(f"Error with Gemini 1.5 Flash model: {str(e)}", file=sys.stderr)
            print(f"Falling back to mock response generator...", file=sys.stderr)
            
            # If API fails, fall back to the mock response generator
            try:
                mock_response = generate_mock_response(test_analysis, user_input)
                print(f"Successfully generated mock response", file=sys.stderr)
                print(f"Mock response: {mock_response[:100]}...", file=sys.stderr)
                return "[Mock Response] " + mock_response
            except Exception as mock_error:
                print(f"Error generating mock response: {str(mock_error)}", file=sys.stderr)
                return "I'm sorry, I encountered an error while processing your question. Please try again or contact support with error code: RESP-ERR."
    except Exception as e:
        print(f"Error in generate_response: {str(e)}", file=sys.stderr)
        return "I'm sorry, I encountered an error while processing your question. Please try again or contact support with error code: MODEL-ERR."

if __name__ == "__main__":
    try:
        # Check if an input file path was provided
        if len(sys.argv) < 2:
            print("Please provide an input file path.")
            sys.exit(1)
        
        input_file = sys.argv[1]
        
        # Check if the file exists
        if not os.path.exists(input_file):
            print(f"Error: Input file '{input_file}' does not exist.", file=sys.stderr)
            print("I'm sorry, I encountered an error. Please try again.")
            sys.exit(1)
        
        # Process the input file
        test_analysis, conversation, user_input = process_input_file(input_file)
        
        # Generate and print the response
        if user_input:
            response = generate_response(test_analysis, conversation, user_input)
            print(response)
        else:
            print("I'm here to help with your blood test results. What would you like to know?")
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        print("I'm sorry, I encountered an error. Please try again.")
