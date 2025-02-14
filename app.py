from flask import Flask, render_template, request, jsonify, session, Response, stream_with_context
from openai import OpenAI
import json
import time
import uuid
import re

app = Flask(__name__)
app.secret_key = str(uuid.uuid4())

API_KEY = "API_KEY" 
ENDPOINT = "https://models.inference.ai.azure.com"
# MODEL_NAME = "o3-mini"
# MODEL_NAME = "gpt-4o-mini
MODEL_NAME = "Meta-Llama-3.1-405B-Instruct"

client = OpenAI(
    base_url=ENDPOINT,
    api_key=API_KEY,
)

CURRENT_TIME = "2025-02-11 23:50:50"
CURRENT_USER = "user"

study_plans = {}

@app.route('/')
def index():
    # Initialize session
    if 'user_info' not in session:
        session['user_info'] = {
            'username': CURRENT_USER,
            'last_active': CURRENT_TIME
        }
    return render_template('index.html', user_info=session['user_info'])

@app.route('/generate_plan', methods=['POST'])
def generate_plan():
    try:
        data = request.get_json()
        
        # Input validation
        if not all(key in data for key in ['subjects', 'days', 'hours', 'goals']):
            return jsonify({"error": "Missing required fields"}), 400

        # Format inputs
        try:
            subjects = [s.strip() for s in data['subjects']]
            days = int(data['days'])
            hours = int(data['hours'])
            goals = [g.strip() for g in data['goals']]
            comments = data.get('comments', '').strip()
        except (ValueError, AttributeError) as e:
            return jsonify({"error": f"Invalid input format: {str(e)}"}), 400

        # Generate unique plan ID
        plan_id = str(uuid.uuid4())
        
        # Store initial empty plan
        study_plans[plan_id] = {
            'content': '',
            'metadata': {
                'subjects': subjects,
                'days': days,
                'hours': hours,
                'goals': goals,
                'created_at': CURRENT_TIME,
                'user': CURRENT_USER
            },
            'status': 'generating'
        }
        
        system_prompt = """You are an AI study planner. Create a detailed study plan using these formatting markers:
# for main sections (always include relevant emojis)
## for subsections
### for topics
* for important points
- for regular points
> for tips and advice
@ for time blocks
! for warnings or things to watch out for
$ for progress tracking points

Include these sections:
1. Overview and Goals 📋
2. Daily Schedule Breakdown ⏰
3. Subject Distribution 📚
4. Progress Milestones 📊
5. Study Tips and Recommendations 💡
"""

        user_prompt = f"""Create a detailed study plan for:
Subjects: {', '.join(subjects)}
Duration: {days} days
Daily Study Hours: {hours} hours
Learning Goals: {', '.join(goals)}
Additional Notes: {comments}

Requirements:
- Balanced distribution of study time
- Regular breaks (Pomodoro technique)
- Clear progress tracking
- Realistic daily goals
- Review sessions
"""
        # Store plan ID in session immediately
        session['current_plan_id'] = plan_id
        session.modified = True

        def generate():
            try:
                response = client.chat.completions.create(
                    model=MODEL_NAME,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    stream=True,
                    temperature=0.7,
                    max_tokens=2000
                )

                accumulated_content = ""
                for chunk in response:
                    try:
                        if hasattr(chunk.choices[0].delta, 'content'):
                            content = chunk.choices[0].delta.content
                            if content:
                                accumulated_content += content
                                # Update the stored plan content
                                study_plans[plan_id]['content'] = accumulated_content
                                yield f"data: {json.dumps({'content': content})}\n\n"
                    except (AttributeError, IndexError) as e:
                        print(f"Chunk processing error: {str(e)}")
                        continue

                # Update plan status when complete
                study_plans[plan_id]['status'] = 'complete'

            except Exception as e:
                print(f"Generation error: {str(e)}")
                study_plans[plan_id]['status'] = 'error'
                study_plans[plan_id]['error'] = str(e)
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no'
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    if not request.is_json:
        return jsonify({"error": "Invalid request format"}), 400

    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        
        # Get plan ID from session
        plan_id = session.get('current_plan_id')
        
        if not plan_id:
            return jsonify({"error": "No active study plan session"}), 404

        if plan_id not in study_plans:
            return jsonify({"error": "Study plan not found"}), 404

        current_plan = study_plans[plan_id]
        
        if current_plan['status'] != 'complete':
            return jsonify({"error": "Study plan is not ready yet"}), 400

        if not current_plan['content']:
            return jsonify({"error": "Study plan content is empty"}), 400

        system_context = f"""You are a helpful study assistant. You have access to the user's study plan:

{current_plan['content']}

Use this plan to provide specific, contextual advice and answer questions.
Always reference specific parts of the plan when relevant.
If the user asks about topics not in the plan, you can still provide general advice
but mention that it's not specifically covered in their current plan."""

        def generate():
            try:
                response = client.chat.completions.create(
                    model=MODEL_NAME,
                    messages=[
                        {"role": "system", "content": system_context},
                        {"role": "user", "content": message}
                    ],
                    stream=True,
                    temperature=0.7,
                    max_tokens=1000
                )

                for chunk in response:
                    try:
                        if hasattr(chunk.choices[0].delta, 'content'):
                            content = chunk.choices[0].delta.content
                            if content:
                                yield f"data: {json.dumps({'content': content})}\n\n"
                    except (AttributeError, IndexError) as e:
                        print(f"Chunk processing error: {str(e)}")
                        continue

            except Exception as e:
                print(f"Chat error: {str(e)}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no'
            }
        )

    except Exception as e:
        print(f"Chat request error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/check_plan_status', methods=['GET'])
def check_plan_status():
    plan_id = session.get('current_plan_id')
    if not plan_id or plan_id not in study_plans:
        return jsonify({"status": "not_found"}), 404
    
    return jsonify({
        "status": study_plans[plan_id]['status'],
        "has_content": bool(study_plans[plan_id]['content'])
    })

@app.before_request
def before_request():
    # Ensure session is initialized
    if 'user_info' not in session:
        session['user_info'] = {
            'username': CURRENT_USER,
            'last_active': CURRENT_TIME
        }

if __name__ == '__main__':
    app.run(debug=True)

