import React, { useState, useEffect } from 'react';
import { render, Text, Box, useInput } from 'ink';
import { scanProfiles, ChromeProfile } from './utils/scanner.js';
import { extractAndSync } from './utils/extractor.js';

const App = () => {
  const [step, setStep] = useState<'scanning' | 'selecting' | 'syncing' | 'done'>('scanning');
  const [profiles, setProfiles] = useState<ChromeProfile[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const found = await scanProfiles();
      setProfiles(found);
      setStep('selecting');
    };
    load();
  }, []);

  useInput((input, key) => {
    if (step === 'selecting') {
      if (key.upArrow) {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      }
      if (key.downArrow) {
        setSelectedIndex(Math.min(profiles.length - 1, selectedIndex + 1));
      }
      if (key.return) {
        setStep('syncing');
        runSync(profiles[selectedIndex]);
      }
    }
    if (key.escape || (key.ctrl && input === 'c')) {
      process.exit(0);
    }
  });

  const runSync = async (profile: ChromeProfile) => {
    try {
      await extractAndSync(profile, (msg) => {
        setLog(prev => [...prev, msg]);
      });
      setStep('done');
    } catch (e) {
      setLog(prev => [...prev, `❌ Failed: ${e}`]);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="double" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">PSP v2.0 - Persistent Sessions Protocol</Text>
      </Box>
      <Box marginLeft={1}>
        <Text dimColor>Universal browser session management</Text>
      </Box>

      {step === 'scanning' && (
        <Box marginTop={1}>
          <Text>Scanning for Chrome profiles...</Text>
        </Box>
      )}

      {step === 'selecting' && (
        <Box flexDirection="column" marginTop={1}>
          <Text underline>Step 1: Select profile to extract</Text>
          <Box flexDirection="column" marginTop={1}>
            {profiles.map((p, i) => (
              <Text key={p.directory} color={i === selectedIndex ? 'green' : 'white'}>
                {i === selectedIndex ? '▸ ' : '  '} {p.name}
              </Text>
            ))}
            {profiles.length === 0 && <Text color="red">No Chrome profiles found.</Text>}
          </Box>
          <Box marginTop={1}>
            <Text dimColor>↑/↓ Navigate · Enter to Select · Esc to Exit</Text>
          </Box>
        </Box>
      )}

      {(step === 'syncing' || step === 'done') && (
        <Box flexDirection="column" marginTop={1}>
          <Text underline>Step 2: Extracting & Syncing</Text>
          <Box flexDirection="column" marginTop={1}>
            {log.map((l, i) => <Text key={i}>{l}</Text>)}
          </Box>
          {step === 'done' && (
            <Box marginTop={1}>
              <Text dimColor>Press Esc or Ctrl+C to exit</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

render(<App />);
