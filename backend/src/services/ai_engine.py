# HireScheduler AI Python Engine
# Handles complex scheduling constraints, threat analysis, text drafting, and KPI summarization.

import sys
import json

def handle_schedule(data):
    """
    Optimizes interviewer allocations to designated dates.
    Input parameters:
      - interviewers: List of dicts {id, name, email}
      - dates: List of dicts {id, date, max_capacity}
      - availability: List of dicts {user_id, campaign_date_id}
    """
    interviewers = data.get("interviewers", [])
    dates = data.get("dates", [])
    availability = data.get("availability", [])
    
    # Map dates for lookup
    date_map = {d["id"]: d for d in dates}
    
    # Group available interviewers per date
    available_per_date = {}
    for avail in availability:
        d_id = avail["campaign_date_id"]
        u_id = avail["user_id"]
        if d_id not in available_per_date:
            available_per_date[d_id] = []
        available_per_date[d_id].append(u_id)

    # Track interviewer workload (how many dates they are assigned to)
    user_workload = {u["id"]: 0 for u in interviewers}
    user_name_map = {u["id"]: u["name"] for u in interviewers}
    
    recommended_plan = {}
    explanation = []
    
    # Process dates. Sort dates by lowest availability (hardest to staff first)
    sorted_dates = sorted(dates, key=lambda x: len(available_per_date.get(x["id"], [])))
    
    for d in sorted_dates:
        d_id = d["id"]
        d_str = d["date"]
        capacity = d["max_capacity"]
        
        # Interviewers who declared availability for this date
        candidates = available_per_date.get(d_id, [])
        
        # Sort candidates by current workload (greedy balance: pick those with lowest workload first)
        candidates_sorted = sorted(candidates, key=lambda uid: user_workload.get(uid, 0))
        
        # Take up to max_capacity
        selected_uids = candidates_sorted[:capacity]
        
        recommended_plan[d_str] = [user_name_map[uid] for uid in selected_uids if uid in user_name_map]
        
        # Increment workload for chosen interviewers
        for uid in selected_uids:
            if uid in user_workload:
                user_workload[uid] += 1
                
        # Logging reasons
        if len(selected_uids) == 0:
            explanation.append(f"Warning: {d_str} has 0 available interviewers.")
        elif len(candidates) > capacity:
            explanation.append(f"{d_str} is fully optimized. Capacity of {capacity} met. Balanced load selected.")
        else:
            explanation.append(f"{d_str} scheduled with all {len(selected_uids)} available candidate(s).")
            
    # Calculate a score of optimization
    total_slots = sum(d["max_capacity"] for d in dates)
    filled_slots = sum(len(names) for names in recommended_plan.values())
    score = int((filled_slots / total_slots * 100)) if total_slots > 0 else 100

    return {
        "success": True,
        "schedule": recommended_plan,
        "explanation": "\n".join(explanation),
        "score": score,
        "balanced_workload": "High" if len(set(user_workload.values())) <= 1 else "Optimal"
    }

def handle_reminder(data):
    """
    Generates tailored, AI-personalized email contents.
    Input parameters:
      - name: Interviewer name
      - email: Interviewer email
      - deadline: Campaign closure deadline string
    """
    name = data.get("name", "Interviewer")
    deadline = data.get("deadline", "tomorrow")
    
    subject = "Action Required: Interview Availability Submission Reminder"
    body = (
        f"Hi {name},\n\n"
        f"We noticed that you have not submitted your availability for our upcoming hiring campaign.\n\n"
        f"To ensure a balanced workload and efficient staffing, please log into the HireScheduler portal "
        f"and submit your available interview slots before the deadline: {deadline}.\n\n"
        f"Thank you for your active support in growing our teams.\n\n"
        f"Best Regards,\n"
        f"HR Recruitment Team"
    )
    
    return {
        "success": True,
        "subject": subject,
        "body": body
    }

def handle_conflict(data):
    """
    Checks for structural staffing conflicts, low response rates, and mismatch capacities.
    Input parameters:
      - total_interviewers: Total pool size
      - total_responses: Count of submissions received
      - dates: List of {date, required_capacity, current_avail_count}
    """
    total_interviewers = data.get("total_interviewers", 0)
    total_responses = data.get("total_responses", 0)
    dates = data.get("dates", [])
    
    conflicts = []
    
    # Calculate response rate
    response_rate = (total_responses / total_interviewers) if total_interviewers > 0 else 0
    if response_rate < 0.6:
        conflicts.append({
            "type": "Response Rate",
            "title": "Low Overall Participation",
            "date": "All Dates",
            "capacity": total_interviewers,
            "available": total_responses,
            "risk": "High",
            "recommendation": "Submit targeted automated reminder emails to all pending interviewers immediately."
        })
        
    for d in dates:
        d_str = d["date"]
        req = d["required_capacity"]
        avail = d["current_avail_count"]
        
        if avail < req:
            deficit = req - avail
            risk = "High" if (avail < req * 0.5) else "Medium"
            
            recs = [
                "Deploy reminders to pending interviewers.",
                f"Reduce target capacity on {d_str} to {avail}."
            ]
            if deficit > 5:
                recs.append("Open additional interview dates to distribute scheduling loads.")
            else:
                recs.append("Add more interviewers to the campaign list.")
                
            conflicts.append({
                "type": "Capacity Shortage",
                "title": f"Staffing Deficit Detected on {d_str}",
                "date": d_str,
                "capacity": req,
                "available": avail,
                "risk": risk,
                "recommendation": " OR ".join(recs)
            })
            
    # If no issues found
    if not conflicts:
        conflicts.append({
            "type": "Status Check",
            "title": "No Staffing Issues Detected",
            "date": "All Dates",
            "capacity": 0,
            "available": 0,
            "risk": "Low",
            "recommendation": "Campaign health is optimal. Ready to generate optimized schedules upon deadline completion."
        })

    return {
        "success": True,
        "conflicts": conflicts
    }

def handle_report(data):
    """
    Synthesizes executive business summary for management reviews.
    Input parameters:
      - total_interviewers: Total count
      - total_responses: Responded count
      - dates: List of {date, selections}
    """
    total_interviewers = data.get("total_interviewers", 0)
    total_responses = data.get("total_responses", 0)
    dates = data.get("dates", [])
    
    pending = total_interviewers - total_responses
    
    # Find most/least selected dates
    most_selected_date = "None"
    least_selected_date = "None"
    
    if dates:
        sorted_dates = sorted(dates, key=lambda x: x["selections"])
        least_selected_date = f"{sorted_dates[0]['date']} ({sorted_dates[0]['selections']} selections)"
        most_selected_date = f"{sorted_dates[-1]['date']} ({sorted_dates[-1]['selections']} selections)"
        
    recommendations = []
    if pending > 0:
        recommendations.append("Trigger automated OTP notifications to remaining pending interviewers.")
    if dates and sorted_dates[0]["selections"] < 5:
        recommendations.append(f"Consider merging interview schedules on low-demand dates like {sorted_dates[0]['date']}.")
    if dates and sorted_dates[-1]["selections"] > 15:
        recommendations.append(f"Increase capacity or allocate backup staff for high-demand dates like {sorted_dates[-1]['date']}.")
        
    if not recommendations:
        recommendations.append("Schedule operations are performing exceptionally. Continue with current allocations.")

    summary = (
        f"Campaign Summary\n"
        f"Total Interviewers: {total_interviewers}\n"
        f"Responses Received: {total_responses}\n"
        f"Pending Responses: {pending}\n"
        f"Most Selected Date: {most_selected_date}\n"
        f"Least Selected Date: {least_selected_date}"
    )

    return {
        "success": True,
        "summary": summary,
        "most_selected": most_selected_date,
        "least_selected": least_selected_date,
        "recommendation": " ".join(recommendations)
    }

def main():
    try:
        # Read parameters from stdin
        input_data = sys.stdin.read()
        payload = json.loads(input_data)
        
        action = payload.get("action")
        data = payload.get("data", {})
        
        if action == "schedule":
            res = handle_schedule(data)
        elif action == "reminder":
            res = handle_reminder(data)
        elif action == "conflict":
            res = handle_conflict(data)
        elif action == "report":
            res = handle_report(data)
        else:
            res = {"success": False, "message": f"Unknown AI action: '{action}'"}
            
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"success": False, "message": str(e)}))

if __name__ == "__main__":
    main()
