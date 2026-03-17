from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="AptiSense ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictInput(BaseModel):
    quantScore: float
    logicalScore: float
    verbalScore: float
    avgScore: float
    testCount: float
    attemptRate: float


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


@app.get("/health")
def health():
    return {"ok": True, "service": "ml-service"}


@app.post("/predict")
def predict(payload: PredictInput):
    weighted_score = (
        payload.quantScore * 0.22
        + payload.logicalScore * 0.22
        + payload.verbalScore * 0.18
        + payload.avgScore * 0.28
        + min(payload.testCount * 3, 15)
        + payload.attemptRate * 0.10
    )

    readiness_score = int(round(clamp(weighted_score / 1.15, 0, 100)))
    success_probability = round(readiness_score / 100, 4)

    weak_topics = []
    if payload.quantScore < 50:
        weak_topics.append("Quantitative Ability")
    if payload.logicalScore < 50:
        weak_topics.append("Logical Reasoning")
    if payload.verbalScore < 50:
        weak_topics.append("Verbal Ability")

    raw_contributions = {
        "quantScore": abs(70 - payload.quantScore),
        "logicalScore": abs(70 - payload.logicalScore),
        "verbalScore": abs(70 - payload.verbalScore),
        "avgScore": abs(75 - payload.avgScore),
        "testCount": min(payload.testCount, 10),
        "attemptRate": abs(80 - payload.attemptRate),
    }

    total = sum(raw_contributions.values()) or 1

    shap_values = {
        key: round(value / total, 4)
        for key, value in raw_contributions.items()
    }

    return {
        "successProbability": success_probability,
        "readinessScore": readiness_score,
        "weakTopics": weak_topics,
        "shapValues": shap_values,
    }