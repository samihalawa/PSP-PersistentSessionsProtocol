import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import styled from 'styled-components';
import * as monaco from 'monaco-editor';
import PSPClient from '@psp/sdk-js';

// Styled components
const Container = styled.div`
  display: flex;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
`;

const Sidebar = styled.div`
  width: 300px;
  background: #1e1e1e;
  color: white;
  padding: 20px;
  overflow-y: auto;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const EditorContainer = styled.div`
  flex: 1;
  position: relative;
`;

const OutputPanel = styled.div`
  height: 300px;
  background: #f8f9fa;
  border-top: 1px solid #dee2e6;
  padding: 20px;
  overflow-y: auto;
`;

const Header = styled.div`
  background: #343a40;
  color: white;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Button = styled.button`
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background: #0056b3;
  }
  
  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
`;

const ConfigSection = styled.div`
  margin-bottom: 30px;
  
  h3 {
    margin-bottom: 15px;
    color: #fff;
  }
  
  label {
    display: block;
    margin-bottom: 8px;
    color: #ccc;
  }
  
  input {
    width: 100%;
    padding: 8px;
    border: 1px solid #555;
    border-radius: 4px;
    background: #2d2d2d;
    color: white;
    
    &:focus {
      outline: none;
      border-color: #007bff;
    }
  }
`;

const ExampleSection = styled.div`
  h3 {
    margin-bottom: 15px;
    color: #fff;
  }
  
  .example-item {
    padding: 10px;
    margin-bottom: 10px;
    background: #2d2d2d;
    border-radius: 4px;
    cursor: pointer;
    
    &:hover {
      background: #3d3d3d;
    }
    
    .title {
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .description {
      font-size: 12px;
      color: #ccc;
    }
  }
`;

const Status = styled.div<{ type: 'success' | 'error' | 'info' }>`
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
  background: ${props => 
    props.type === 'success' ? '#d4edda' : 
    props.type === 'error' ? '#f8d7da' : 
    '#d1ecf1'};
  color: ${props => 
    props.type === 'success' ? '#155724' : 
    props.type === 'error' ? '#721c24' : 
    '#0c5460'};
  border: 1px solid ${props => 
    props.type === 'success' ? '#c3e6cb' : 
    props.type === 'error' ? '#f5c6cb' : 
    '#bee5eb'};
`;

// Example code snippets
const examples = [
  {
    title: 'Create Session',
    description: 'Create a new session with basic configuration',
    code: `// Create a new session
const session = await client.createSession({
  name: 'My Test Session',
  url: 'https://example.com',
  tags: ['test', 'demo'],
  autoCapture: true
});

console.log('Session created:', session);
return session;`
  },
  {
    title: 'List Sessions',
    description: 'Retrieve all sessions with optional filtering',
    code: `// List all sessions
const sessions = await client.listSessions();
console.log('All sessions:', sessions);

// List sessions with filter
const filtered = await client.listSessions({
  tags: ['test'],
  createdAfter: new Date('2024-01-01')
});
console.log('Filtered sessions:', filtered);

return { all: sessions, filtered };`
  },
  {
    title: 'Get Session',
    description: 'Retrieve a specific session by ID',
    code: `// Replace with actual session ID
const sessionId = 'your-session-id-here';

try {
  const session = await client.getSession(sessionId);
  console.log('Session found:', session);
  return session;
} catch (error) {
  console.error('Session not found:', error.message);
  return null;
}`
  },
  {
    title: 'Update Session',
    description: 'Update session data',
    code: `// Replace with actual session ID
const sessionId = 'your-session-id-here';

const updated = await client.updateSession(sessionId, {
  name: 'Updated Session Name',
  tags: ['updated', 'modified']
});

console.log('Session updated:', updated);
return updated;`
  },
  {
    title: 'Browser Capture',
    description: 'Capture current browser session (browser only)',
    code: `// Capture current browser state
// Note: This only works in browser environments
try {
  const session = await client.captureSession({
    name: 'Captured Session',
    url: window.location.href,
    tags: ['captured', 'browser']
  });
  
  console.log('Session captured:', session);
  return session;
} catch (error) {
  console.error('Capture failed:', error.message);
  return null;
}`
  },
  {
    title: 'Restore Session',
    description: 'Restore session in browser (browser only)',
    code: `// Replace with actual session ID
const sessionId = 'your-session-id-here';

try {
  await client.restoreSession(sessionId);
  console.log('Session restored successfully');
  return { success: true };
} catch (error) {
  console.error('Restore failed:', error.message);
  return { success: false, error: error.message };
}`
  }
];

const Playground: React.FC = () => {
  const [client, setClient] = useState<PSPClient | null>(null);
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [output, setOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [config, setConfig] = useState({
    baseUrl: 'http://localhost:3001',
    apiKey: ''
  });

  useEffect(() => {
    // Initialize Monaco Editor
    const editorInstance = monaco.editor.create(
      document.getElementById('editor')!,
      {
        value: examples[0].code,
        language: 'typescript',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        readOnly: false,
        wordWrap: 'on'
      }
    );

    setEditor(editorInstance);

    return () => {
      editorInstance.dispose();
    };
  }, []);

  useEffect(() => {
    // Initialize PSP Client
    if (config.baseUrl) {
      const pspClient = new PSPClient({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey || undefined,
        timeout: 30000
      });

      // Set up event listeners
      pspClient.on('session:created', (session) => {
        addToOutput(`✅ Session created: ${session.id}`);
      });

      pspClient.on('session:error', (error) => {
        addToOutput(`❌ Error: ${error.message}`);
      });

      pspClient.on('request:start', () => {
        addToOutput('🔄 Making API request...');
      });

      setClient(pspClient);
    }
  }, [config]);

  const addToOutput = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setOutput(prev => `${prev}[${timestamp}] ${message}\n`);
  };

  const executeCode = async () => {
    if (!client || !editor) return;

    setIsExecuting(true);
    const code = editor.getValue();
    
    try {
      addToOutput('🚀 Executing code...');
      
      // Create a function that has access to the client
      const asyncFunction = new Function('client', `
        return (async () => {
          ${code}
        })();
      `);

      const result = await asyncFunction(client);
      addToOutput(`✅ Execution completed`);
      addToOutput(`📊 Result: ${JSON.stringify(result, null, 2)}`);
    } catch (error: any) {
      addToOutput(`❌ Execution failed: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const loadExample = (example: typeof examples[0]) => {
    if (editor) {
      editor.setValue(example.code);
    }
  };

  const clearOutput = () => {
    setOutput('');
  };

  return (
    <Container>
      <Sidebar>
        <ConfigSection>
          <h3>Configuration</h3>
          <label>
            Base URL:
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
              placeholder="http://localhost:3001"
            />
          </label>
          <label>
            API Key (optional):
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              placeholder="Enter API key"
            />
          </label>
        </ConfigSection>

        <ExampleSection>
          <h3>Examples</h3>
          {examples.map((example, index) => (
            <div
              key={index}
              className="example-item"
              onClick={() => loadExample(example)}
            >
              <div className="title">{example.title}</div>
              <div className="description">{example.description}</div>
            </div>
          ))}
        </ExampleSection>
      </Sidebar>

      <MainContent>
        <Header>
          <h1>PSP API Playground</h1>
          <div>
            <Button onClick={executeCode} disabled={isExecuting || !client}>
              {isExecuting ? 'Executing...' : 'Run Code'}
            </Button>
            <Button onClick={clearOutput} style={{ marginLeft: '10px', background: '#6c757d' }}>
              Clear Output
            </Button>
          </div>
        </Header>

        <EditorContainer>
          <div id="editor" style={{ height: '100%' }} />
        </EditorContainer>

        <OutputPanel>
          <h4>Output</h4>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {output || 'No output yet. Run some code to see results here.'}
          </pre>
        </OutputPanel>
      </MainContent>
    </Container>
  );
};

// Initialize React app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<Playground />);