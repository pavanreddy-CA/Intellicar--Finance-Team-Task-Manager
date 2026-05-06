import os

file_path = r'c:\Users\PavanKumarReddy\.gemini\antigravity\scratch\task-manager-webapp\src\components\DashboardClient.tsx'

with open(file_path, 'rb') as f:
    content = f.read()

# Using bytes to be absolutely sure about encoding and line endings
old_bytes = b'                            <td style={getTdStyle(t)}>\r\n                              <span style={{ padding: "4px 8px", background: "#f8fafc", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", border: "1px solid #e2e8f0" }}>'
new_bytes = b'                            <td style={{ ...getTdStyle(t), minWidth: "7.7cm", maxWidth: "7.7cm" }}>\r\n                              <span style={{ padding: "4px 8px", background: "#f8fafc", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", border: "1px solid #e2e8f0" }}>'

if old_bytes in content:
    new_content = content.replace(old_bytes, new_bytes)
    with open(file_path, 'wb') as f:
        f.write(new_content)
    print("Successfully updated with bytes.")
else:
    print("Target bytes not found.")
    # Show what we found around that area for debugging
    idx = content.find(b'task.departmentName')
    if idx != -1:
        print("Context around departmentName:")
        print(content[idx-150:idx+50])
