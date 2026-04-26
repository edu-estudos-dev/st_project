import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const port = Number(process.argv[2] || process.env.PORT || 8082);

if (!Number.isInteger(port) || port <= 0) {
  console.error('Porta inválida para liberar.');
  process.exit(1);
}

const runCommand = command => {
  try {
    return execSync(command, {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8'
    }).trim();
  } catch {
    return '';
  }
};

const killWindowsListeners = targetPort => {
  const output = runCommand(`netstat -ano -p tcp | findstr :${targetPort}`);
  if (!output) return [];

  const pids = [
    ...new Set(
      output
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .filter(line => /\bLISTENING\b/i.test(line))
        .map(line => line.split(/\s+/).pop())
        .filter(pid => /^\d+$/.test(pid))
    )
  ];

  pids.forEach(pid => {
    runCommand(`taskkill /PID ${pid} /F`);
  });

  return pids;
};

const killUnixListeners = targetPort => {
  const output = runCommand(`lsof -ti tcp:${targetPort}`);
  if (!output) return [];

  const pids = [
    ...new Set(
      output
        .split(/\r?\n/)
        .map(item => item.trim())
        .filter(pid => /^\d+$/.test(pid))
    )
  ];

  pids.forEach(pid => {
    runCommand(`kill -9 ${pid}`);
  });

  return pids;
};

const killedPids =
  process.platform === 'win32'
    ? killWindowsListeners(port)
    : killUnixListeners(port);

if (killedPids.length) {
  console.log(
    `Porta ${port} liberada. Processo(s) encerrado(s): ${killedPids.join(', ')}`
  );
} else {
  console.log(`Porta ${port} já estava livre.`);
}
