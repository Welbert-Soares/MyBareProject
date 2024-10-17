import { LowEnergy } from './Bluetooh'; // ajuste o caminho
import { NativeModules, NativeEventEmitter } from 'react-native';

// Mock do NativeEventEmitter
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  return jest.fn().mockImplementation(() => {
    return {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
    };
  });
});

// Mock do BleManager
jest.mock('react-native-ble-manager', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  retrieveServices: jest.fn(),
  requestMTU: jest.fn(),
  read: jest.fn(),
  write: jest.fn(),
  startNotification: jest.fn(),
  stopNotification: jest.fn(),
  checkState: jest.fn(),
}));

// Mock do NativeModules
NativeModules.BleManager = { // Aqui você pode adicionar métodos ou propriedades que precisar
  start: jest.fn(),
  stop: jest.fn(),
  // Adicione outros métodos conforme necessário
};

describe('LowEnergy Class', () => {
  const endereco = '00:11:22:33:44:55'; // Exemplo de endereço
  const lowEnergy = new LowEnergy(endereco);

  beforeEach(() => {
    jest.clearAllMocks(); // Limpar mocks antes de cada teste
  });

  test('deve iniciar conexão com o dispositivo', async () => {
    const connectMock = require('react-native-ble-manager').connect;
    connectMock.mockResolvedValueOnce(undefined);
    const hasPermission = jest.spyOn(lowEnergy as any, 'verificar_permissao_BT').mockResolvedValueOnce(true);

    await lowEnergy.iniciar_conexao();

    expect(hasPermission).toHaveBeenCalledWith('conectar');
    expect(connectMock).toHaveBeenCalledWith(endereco);
  });

  test('deve forçar desconexão do dispositivo', async () => {
    const disconnectMock = require('react-native-ble-manager').disconnect;
    disconnectMock.mockResolvedValueOnce(undefined);

    await lowEnergy.forcar_desconexao('Título', 'Mensagem');

    expect(disconnectMock).toHaveBeenCalledWith(endereco);
    // Teste para verificar o console.log
  });

  test('deve identificar canais disponíveis', async () => {
    const dados = {
      characteristics: [
        {
          properties: ['Read', 'Write', 'Notify'],
          characteristic: '0001',
          service: '0100',
        },
      ],
    };

    await lowEnergy.identificar_canais(dados);

    expect(lowEnergy.canais['0001']).toBeDefined();
    expect(lowEnergy.canais['0001'].read).toBeDefined();
    expect(lowEnergy.canais['0001'].write).toBeDefined();
    expect(lowEnergy.canais['0001'].notify).toBeDefined();
  });

  // Adicione mais testes para outros métodos...
});
