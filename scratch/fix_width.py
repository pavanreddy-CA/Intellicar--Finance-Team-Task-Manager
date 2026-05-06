import os

file_path = r'c:\Users\PavanKumarReddy\.gemini\antigravity\scratch\task-manager-webapp\src\components\DashboardClient.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_text = """                             <td style={getTdStyle(t)}>
                               <span style={{ padding: "4px 8px", background: "#f8fafc", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", border: "1px solid #e2e8f0" }}>"""

new_text = """                             <td style={{ ...getTdStyle(t), minWidth: "7.7cm", maxWidth: "7.7cm" }}>
                               <span style={{ padding: "4px 8px", background: "#f8fafc", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", border: "1px solid #e2e8f0" }}>"""

if old_text in content:
    new_content = content.replace(old_text, new_text)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully updated.")
else:
    # Try with CRLF just in case
    old_text_crlf = old_text.replace('\n', '\r\n')
    new_text_crlf = new_text.replace('\n', '\r\n')
    if old_text_crlf in content:
        new_content = content.replace(old_text_crlf, new_text_crlf)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Successfully updated (CRLF).")
    else:
        print("Target text not found.")
