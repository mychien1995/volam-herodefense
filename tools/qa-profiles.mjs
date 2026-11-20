import contracts from './qa-profile-contracts.json' with { type: 'json' };

export const qaProfileContracts = contracts.profiles;

export function qaConfigName(args = []) {
  let config = 'playwright.config.ts';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' || args[i] === '-c') {
      config = args[++i];
      if (!config || config.startsWith('-'))
        throw Error('--config requires a path');
    } else if (/^(?:--config|-c)=/.test(args[i]))
      config = args[i].slice(args[i].indexOf('=') + 1);
  }
  return config.split(/[\\/]/).at(-1);
}

export function qaProfile(mode, args = []) {
  if (mode === 'quick') return null;
  const name = qaConfigName(args),
    contract = qaProfileContracts[name];
  return contract ? { name, ...contract } : null;
}

const port = (value, label) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 65535)
    throw Error(label + ' must be a port from 1 to 65535');
  return number;
};

export function qaProfilePorts(contract, env = process.env) {
  if ((contract.externalFlags ?? []).some((name) => env[name] === '1'))
    throw Error(
      'Managed QA requires owned services; this profile has a USE_LIVE flag enabled',
    );
  const services = contract.services.map((s) => ({ ...s }));
  for (const key of contract.unsupportedEnv ?? [])
    if (env[key] !== undefined)
      throw Error(
        `${contract.name} preflight does not support ${key}; use its audited default ports`,
      );
  const first = services[0];
  if (contract.ports !== 'shared') {
    for (const [key, field] of [
      ['VOLAM_QA_SERVER_PORT', 'serverPort'],
      ['VOLAM_QA_CLIENT_PORT', 'clientPort'],
    ]) {
      if (
        env[key] !== undefined &&
        (contract.ports === 'alias' ||
          services.length !== 1 ||
          first[field] === undefined ||
          port(env[key], key) !== first[field])
      )
        throw Error(
          `${contract.name} keeps its legacy ports; ${key} is not supported here${contract.serverEnv ? '; use ' + contract.serverEnv + ' / ' + contract.clientEnv : ''}`,
        );
    }
  }
  if (contract.ports === 'shared') {
    if (env.VOLAM_QA_SERVER_PORT !== undefined)
      first.serverPort = port(env.VOLAM_QA_SERVER_PORT, 'VOLAM_QA_SERVER_PORT');
    if (env.VOLAM_QA_CLIENT_PORT !== undefined)
      first.clientPort = port(env.VOLAM_QA_CLIENT_PORT, 'VOLAM_QA_CLIENT_PORT');
  } else if (contract.ports === 'alias') {
    if (env[contract.serverEnv] !== undefined)
      first.serverPort = port(env[contract.serverEnv], contract.serverEnv);
    if (env[contract.clientEnv] !== undefined)
      first.clientPort = port(env[contract.clientEnv], contract.clientEnv);
  }
  const ports = services.flatMap((s) =>
    [s.serverPort, s.clientPort].filter((p) => p !== undefined),
  );
  for (const item of contract.extraPorts ?? [])
    ports.push(
      port(
        item.env ? (env[item.env] ?? item.port) : item.port,
        item.env ?? 'fixture port',
      ),
    );
  for (const p of ports) port(p, 'profile port');
  if (new Set(ports).size !== ports.length)
    throw Error('Profile service ports must be distinct');
  return { services, ports };
}
