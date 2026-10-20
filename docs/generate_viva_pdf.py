from pathlib import Path


TITLE = "AptiSense Viva and Presentation Guide"

LINES = [
    "AptiSense Viva and Presentation Guide",
    "",
    "Project Title",
    "AptiSense: AI-Powered Aptitude Assessment and Placement Readiness Prediction System",
    "",
    "1. One-Line Introduction",
    "AptiSense is a web-based aptitude assessment platform that helps students take mock tests,",
    "analyze their performance, and predict their placement readiness using analytics and an ML service.",
    "",
    "2. Main Goal of the Project",
    "The goal of the project is to move beyond simple test scores and provide meaningful insights like",
    "readiness score, success probability, weak-topic identification, and batch-level analytics.",
    "",
    "3. Tech Stack",
    "Frontend: React, TypeScript, Vite",
    "Backend: Node.js, Express.js",
    "Database: MongoDB",
    "ML Service: Python, FastAPI",
    "Charts: Recharts",
    "Authentication: JWT-based login",
    "",
    "4. Main Parts of the Project",
    "Frontend: Displays student and admin dashboards and handles user interaction.",
    "Backend: Handles authentication, tests, scoring, analytics, and DB communication.",
    "ML Service: Calculates readiness score, success probability, and weak topics.",
    "Database: Stores users, tests, results, and predictions.",
    "",
    "5. Working Flow",
    "1. User logs in.",
    "2. Student selects and starts a mock test.",
    "3. Student answers aptitude questions section by section.",
    "4. Backend evaluates answers after submission.",
    "5. Backend computes section scores, average score, accuracy, and time taken.",
    "6. Backend stores the test result in MongoDB.",
    "7. Backend sends performance features to the ML service.",
    "8. ML service returns readiness score, success probability, weak topics, and feature contributions.",
    "9. Student dashboard displays analytics and prediction results.",
    "10. Admin dashboard displays batch-level insights and risk categories.",
    "",
    "6. Student Dashboard",
    "Shows placement success probability, readiness score, weakness alert, tests taken count,",
    "skill radar chart, performance trend, and available mock tests.",
    "",
    "7. Admin Dashboard",
    "Shows total students, safe/moderate/at-risk categories, batch heatmap, weak-topic analysis,",
    "and student performance table.",
    "",
    "8. Important Database Collections",
    "User: stores name, email, password, role.",
    "Test: stores title, pattern, time limit, sections, questions, options, correct answers.",
    "TestResult: stores section scores, average score, accuracy, time taken, and references.",
    "Prediction: stores success probability, readiness score, weak topics, and shap-like values.",
    "",
    "9. How Scoring Works",
    "The backend compares selected options with the correct answers and calculates section-wise",
    "and overall performance metrics. These results are saved in the database.",
    "",
    "10. How Prediction Works",
    "The ML service uses performance features such as quant score, logical score, verbal score,",
    "average score, test count, and attempt quality. Based on these inputs, it calculates a",
    "readiness score and success probability and identifies weak topics.",
    "",
    "11. Key Viva Answer",
    "If asked whether this is a full trained ML model, answer honestly:",
    "The current version uses weighted predictive logic through a separate ML service, and it can",
    "be upgraded later to a fully trained machine learning model using real student placement data.",
    "",
    "12. Advantages",
    "1. Easy-to-use interface",
    "2. Automated test evaluation",
    "3. Section-wise analytics",
    "4. Readiness prediction",
    "5. Weak-topic identification",
    "6. Useful for both students and admins",
    "",
    "13. Limitations",
    "1. Prediction logic is currently basic",
    "2. Focused only on aptitude sections",
    "3. Depends on proper backend, database, and ML setup",
    "4. Does not yet support coding or interview rounds",
    "",
    "14. Future Scope",
    "1. Add coding assessment",
    "2. Add personalized recommendations",
    "3. Use trained ML models on real datasets",
    "4. Support company-specific test patterns",
    "5. Deploy as a cloud-based platform",
    "",
    "15. 60-Second Presentation Script",
    "My project is AptiSense, an AI-powered aptitude assessment and placement readiness prediction system.",
    "It helps students prepare for placements by providing mock aptitude tests, performance analytics,",
    "and predictive insights. The frontend is built with React and TypeScript, the backend uses Node.js",
    "and Express, MongoDB stores the data, and a Python FastAPI service generates prediction insights.",
    "After a student submits a test, the backend calculates scores, stores results, sends performance",
    "features to the ML service, and then shows readiness score, success probability, and weak topics",
    "on the student dashboard. Admins can also monitor batch performance and topic-wise weaknesses.",
    "",
    "16. Common Viva Questions and Short Answers",
    "Q1. What is AptiSense?",
    "A web-based aptitude assessment and placement readiness prediction platform.",
    "",
    "Q2. Why did you build this project?",
    "To help students understand readiness and weak areas, not just raw marks.",
    "",
    "Q3. Why use React?",
    "To build a reusable and interactive frontend with dashboards.",
    "",
    "Q4. Why use MongoDB?",
    "Because the project data fits well into document-based storage.",
    "",
    "Q5. Why use FastAPI?",
    "Because it is lightweight and efficient for ML-related APIs.",
    "",
    "Q6. What does the backend do?",
    "It handles authentication, tests, scoring, analytics, and DB operations.",
    "",
    "Q7. What does the ML service do?",
    "It predicts readiness score, success probability, and weak topics from performance features.",
    "",
    "Q8. What is JWT used for?",
    "JWT is used for secure login and protected API access.",
    "",
    "Q9. What is the role of the admin?",
    "To monitor batch performance and identify students at risk.",
    "",
    "Q10. What is future scope?",
    "Coding assessment, stronger ML models, and personalized recommendations.",
    "",
    "17. Final Survival Template for Viva",
    "If you forget details, say:",
    "The frontend handles the user interface.",
    "The backend handles business logic and database operations.",
    "The ML service predicts readiness from test performance features.",
    "MongoDB stores users, tests, results, and predictions.",
]


def escape_pdf_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def build_content_stream(lines: list[str]) -> bytes:
    commands = ["BT", "/F1 16 Tf", "72 800 Td", f"({escape_pdf_text(TITLE)}) Tj", "0 -28 Td", "/F1 11 Tf"]
    first_body_line = True
    for line in lines[1:]:
        if first_body_line:
            first_body_line = False
        else:
            commands.append("0 -16 Td")
        commands.append(f"({escape_pdf_text(line)}) Tj")
    commands.append("ET")
    return "\n".join(commands).encode("latin-1", errors="replace")


def make_pdf(output_path: Path) -> None:
    content = build_content_stream(LINES)
    objects: list[bytes] = []

    def add_object(data: bytes) -> int:
        objects.append(data)
        return len(objects)

    add_object(b"<< /Type /Catalog /Pages 2 0 R >>")
    add_object(b"<< /Type /Pages /Count 3 /Kids [3 0 R 4 0 R 5 0 R] >>")

    add_object(
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] "
        b"/Resources << /Font << /F1 6 0 R >> >> /Contents 7 0 R >>"
    )
    add_object(
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] "
        b"/Resources << /Font << /F1 6 0 R >> >> /Contents 8 0 R >>"
    )
    add_object(
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] "
        b"/Resources << /Font << /F1 6 0 R >> >> /Contents 9 0 R >>"
    )
    add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    page1 = build_content_stream(LINES[:46])
    page2 = build_content_stream([TITLE] + LINES[46:92])
    page3 = build_content_stream([TITLE] + LINES[92:])

    add_object(f"<< /Length {len(page1)} >>\nstream\n".encode() + page1 + b"\nendstream")
    add_object(f"<< /Length {len(page2)} >>\nstream\n".encode() + page2 + b"\nendstream")
    add_object(f"<< /Length {len(page3)} >>\nstream\n".encode() + page3 + b"\nendstream")

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{i} 0 obj\n".encode())
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_pos = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode())
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode())
    pdf.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_pos}\n%%EOF"
        ).encode()
    )

    output_path.write_bytes(pdf)


if __name__ == "__main__":
    output = Path(__file__).with_name("AptiSense_Viva_Guide.pdf")
    make_pdf(output)
    print(f"Created {output.resolve()}")
