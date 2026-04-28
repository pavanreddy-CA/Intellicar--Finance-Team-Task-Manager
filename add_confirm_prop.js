const fs = require('fs');

const addConfirmProp = (filePath, componentName) => {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Add to destructuring of props in function signature
    const funcRegex = new RegExp(`export default function ${componentName}\\s*\\(\\{([^}]*)\\}\\s*:\\s*([^)]*)\\)`);
    content = content.replace(funcRegex, (match, props, type) => {
        if (!props.includes('showConfirm')) {
            const updatedProps = props.trim().endsWith(',') ? `${props} showConfirm` : `${props}, showConfirm`;
            let updatedType = type.trim();
            if (updatedType.endsWith('}')) {
                updatedType = updatedType.slice(0, -1).trim().endsWith(';') || updatedType.slice(0, -1).trim().endsWith(',') 
                    ? `${updatedType.slice(0, -1)} showConfirm: any; }` 
                    : `${updatedType.slice(0, -1)}; showConfirm: any; }`;
            }
            return `export default function ${componentName}({ ${updatedProps} }: ${updatedType})`;
        }
        return match;
    });

    // 2. Handle interface/type definitions
    const interfaceRegex = new RegExp(`(interface|type) ${componentName}Props\\s*=\\s*\\{([^}]*)\\}`, 'g');
    content = content.replace(interfaceRegex, (match, keyword, body) => {
        if (!body.includes('showConfirm')) {
            const separator = body.includes(';') ? ';' : ',';
            const updatedBody = body.trim().endsWith(separator) ? `${body} showConfirm: any;` : `${body}${separator} showConfirm: any;`;
            return `${keyword} ${componentName}Props = {${updatedBody}}`;
        }
        return match;
    });

    fs.writeFileSync(filePath, content);
};

const files = [
    { path: 'src/components/PaymentsCalendar.tsx', name: 'PaymentsCalendar' },
    { path: 'src/components/RecurringActivities.tsx', name: 'RecurringActivities' },
    { path: 'src/components/TaskForm.tsx', name: 'TaskForm' }
];

files.forEach(f => {
    try {
        addConfirmProp(f.path, f.name);
        console.log(`Added showConfirm to ${f.name}`);
    } catch (e) {
        console.error(`Failed to update ${f.name}: ${e.message}`);
    }
});
