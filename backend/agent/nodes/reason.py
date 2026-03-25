import json
from agent.state import AgentState, RiskLevel
from config import get_llm
from langchain_core.messages import HumanMessage, SystemMessage

SYSTEM_PROMPT = """You are a clinical AI reasoning engine.
You analyze patient data over time and output a structured JSON risk assessment.
You DO NOT make treatment decisions. You assess risk and suggest monitoring strategies.
Notice the trends in the `vitals_history` array (e.g., falling blood pressure over multiple readings, or rising heart rate).

Output ONLY valid JSON in this exact format:
{
  "risk_level": "low|moderate|high|critical",
  "risk_confidence": 0.0-1.0,
  "reasoning_summary": "brief explanation, nothing any trends found in vitals history",
  "hypotheses": ["hypothesis 1", "hypothesis 2"],
  "suggested_goal": "increase_certainty|prevent_deterioration|reduce_false_positive|balance_workload|maintain_stability"
}"""

def reason_node(state: AgentState) -> AgentState:
    """Node 3: LLM analyzes state + memory → risk assessment"""
    llm = get_llm()

    patient_data = {
        "vitals_history": [v.model_dump() for v in state.vitals_history],
        "lab_results": state.lab_results,
        "medical_notes": state.medical_notes,
        "current_status": state.status,
        "ward_workload": state.ward.model_dump() if state.ward else {},
        "memory": state.memory_context,
    }

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Analyze this patient:\n{json.dumps(patient_data, default=str, indent=2)}")
    ]

    response = llm.invoke(messages)
    raw = response.content.strip()
    if raw.startswith("```json"):
        raw = raw[7:-3].strip()
    elif raw.startswith("```"):
        raw = raw[3:-3].strip()

    # Parse JSON response
    data = json.loads(raw)
    state.risk_level = RiskLevel(data["risk_level"])
    state.risk_confidence = data["risk_confidence"]
    state.reasoning_summary = data["reasoning_summary"]
    state.hypotheses = data["hypotheses"]
    state._suggested_goal = data.get("suggested_goal")  # temp attr for goal node

    state.log(f"[REASON] Risk={state.risk_level} ({state.risk_confidence:.0%}) — {state.reasoning_summary}")
    return state