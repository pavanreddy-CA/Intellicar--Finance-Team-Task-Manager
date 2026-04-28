const fs = require('fs');

const replaceAlerts = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace alert("...") with showNotification("...")
    // Handle both single and double quotes
    content = content.replace(/alert\((['"])(.*?)\1\)/g, 'showNotification("$2")');
    fs.writeFileSync(filePath, content);
};

const files = [
    'src/components/DashboardClient.tsx',
    'src/components/PaymentsCalendar.tsx',
    'src/components/RecurringActivities.tsx',
    'src/components/TaskForm.tsx'
];

files.forEach(f => {
    try {
        replaceAlerts(f);
        console.log(`Replaced alerts in ${f}`);
    } catch (e) {
        console.error(`Failed to update ${f}: ${e.message}`);
    }
});
