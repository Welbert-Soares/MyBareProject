import BleManager from 'react-native-ble-manager';
import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';
import { TextEncoder, TextDecoder } from 'text-encoding';


// Inicialização dos módulos e eventos Bluetooth
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

// Interface para canais Bluetooth
interface Canal {
  read?: () => Promise<any>;
  write?: (data: any) => Promise<void>;
  notify?: (action: string) => Promise<any>;
}

// Classe base para Bluetooth
class Bluetooth {
  static disp: Classic | LowEnergy | null = null;
  endereco: string | null = null;

  constructor(endereco: string) {
    this.endereco = endereco;
  }
}

// Classe para Bluetooth Clássico (ainda não implementada)
class Classic extends Bluetooth {
  // ainda não sei os atributos e métodos dessa classe
}

// Classe para Bluetooth de Baixo Consumo
export class LowEnergy extends Bluetooth {
  static encoder = new TextEncoder();
  static decoder = new TextDecoder("utf-8");
  dados: any = null;
  canais: { [key: string]: Canal } = {};
  service: string = "0100";

  constructor(endereco: string) {
    super(endereco);
  }

  // Iniciar conexão Bluetooth
  async iniciar_conexao(): Promise<void> {
    console.log("Conectando com o módulo");
    if (this.endereco) {
      const hasPermission = await verificar_permissao_BT("conectar");
      if (hasPermission) {
        BleManager.connect(this.endereco)
          .then(() => this._retrieveServices())
          .catch(this.iniciar_desconexao.bind(this));
      } else {
        console.log("Permissão necessária para conectar ao dispositivo.");
      }
    }
  }

  private _retrieveServices(): void {
    if (!this.endereco) return;

    BleManager.retrieveServices(this.endereco)
      .then((peripheralInfo: any) => {
        this.identificar_canais(peripheralInfo);
        if (Platform.OS === "android") {
          this._handleMTURequest();
        }
      })
      .catch((err: Error) => {
        console.log("Erro", err.message);
        this.iniciar_desconexao();
      });
  }

  private _handleMTURequest(): void {
    if (!this.endereco) return;

    BleManager.requestMTU(this.endereco, 500)
      .then(async () => {
        const velocidade = await this.canais["0107"].notify?.("start");
        await this.canais["0107"].notify?.("stop");
        if (velocidade && velocidade > 5) {
          console.log("Alerta", "Veículo em movimento, não mexa no celular enquanto dirige!");
          return;
        }
        // bloquear_tudo("desbloquear");
        // setTimeout(async () => {
        //   await this._verificarTelaAtual();
        // }, 500);
      })
      .catch((failure: any) => console.log("Falha ao requisitar MTU.", failure));
  }

  // Desconectar do dispositivo Bluetooth
  iniciar_desconexao(): void {
    if (!this.endereco) return;

    BleManager.isPeripheralConnected(this.endereco, [])
      .then((isConnected: boolean) => {
        if (isConnected) {
          this.forcar_desconexao("Sucesso", "Desconectou do dispositivo");
        } else {
          console.log("Erro", "Não foi possível conectar com dispositivo");
        }
      });
  }

  // Forçar desconexão
  forcar_desconexao(titulo = "", msg = ""): void {
    if (!this.endereco) return;

    BleManager.disconnect(this.endereco)
      .then(() => console.log(titulo, msg))
      .catch((erro: any) => console.log("Erro ao desconectar do dispositivo", erro));
  }

  // Identificar canais disponíveis no dispositivo Bluetooth
  identificar_canais(dados: any): void {
    this.dados = dados;

    console.log("Identificando canais...");
    for (const dado of dados.characteristics) {
      const { properties, characteristic, service } = dado;
      console.log(`Characteristic: ${characteristic}, Properties: ${properties}`);

      const { endereco } = this;

      if (service === this.service && endereco) {
        this._inicializarCanais(characteristic, properties, service, endereco);
      }
    }
    console.log("Canais identificados:", this.canais);
  }

  private _inicializarCanais(characteristic: string, properties: string[], service: string, endereco: string): void {
    this.canais[characteristic] = {};

    if (properties.includes("Read")) {
      this.canais[characteristic].read = () =>
        BleManager.read(endereco, service, characteristic)
          .then((value: number[]) => convertArrayBuffer(new Uint8Array(value).buffer))
          .catch((erro: any) => console.error("Erro ao ler dados", erro));
    }

    if (properties.includes("Write")) {
      this.canais[characteristic].write = (data: any) =>
        BleManager.write(endereco, service, characteristic, data)
          .then(() => console.log("Dado salvo com sucesso no módulo."))
          .catch((erro: any) => console.log("Erro ao salvar dados no módulo", erro));
    }

    if (properties.includes("Notify")) {
      this.canais[characteristic].notify = (action: string) =>
        this._gerenciarNotificacao(action, endereco, service, characteristic);
    }
  }

  private async _gerenciarNotificacao(action: string, endereco: string, service: string, characteristic: string): Promise<any> {
    try {
      if (action === "start") {
        await BleManager.startNotification(endereco, service, characteristic);
        return new Promise((resolve, reject) => {
          bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', ({ value, peripheral, characteristic: char }) => {
            if (peripheral === endereco && char === characteristic) {
              resolve(convertArrayBuffer(new Uint8Array(value).buffer));
            }
          });
        });
      } else {
        return BleManager.stopNotification(endereco, service, characteristic)
          .then(() => console.log("Notificação parada"))
          .catch((err: Error) => console.error(err));
      }
    } catch (err) {
      console.log("Falha ao monitorar canais", err);
    }
  }
}

// Verificar permissões do Bluetooth
type PermissaoBT = 'escanear' | 'conectar' | 'localizacao';

export async function verificar_permissao_BT(perm: PermissaoBT): Promise<boolean> {
  try {
    let permission;
    if (perm === 'escanear') {
      permission = PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN;
    } else if (perm === 'conectar') {
      permission = PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT;
    } else if (perm === 'localizacao') {
      permission = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
    }

    if (!permission) {
      console.log(`Permissão de ${perm} não encontrada.`);
      return false;
    }
    const hasPermission = await PermissionsAndroid.check(permission);
    if (hasPermission) {
      console.log(`Permissão de ${perm} concedida.`);
      return true;
    } else {
      console.log(`Permissão de ${perm} não concedida.`);
      const status = await PermissionsAndroid.request(permission);
      if (status === PermissionsAndroid.RESULTS.GRANTED) {
        console.log(`Permissão de ${perm} concedida após solicitação.`);
        return true;
      } else {
        console.log(`Permissão de ${perm} negada.`);
        return false;
      }
    }
  } catch (err) {
    console.error(err);
    return false;
  }
}

// Verificar estado do Bluetooth
function BT_estaHabilitado(): void {
  BleManager.checkState();
  bleManagerEmitter.addListener('BleManagerDidUpdateState', (args: { state: string }) => {
    if (args.state === 'on') {
      // ListaDisp.controlarTela("Abrir");
      console.log("abrindo tela");
    } else {
      console.log("Erro", "Bluetooth Desligado");
    }
  });
}

// Funções auxiliares para conversão de dados
function convertArrayBuffer(arrayBuffer: ArrayBuffer): any {
  const byteLength = arrayBuffer.byteLength;
  const arrByte: { [key: number]: () => number | bigint } = {
    1: () => new Uint8Array(arrayBuffer)[0],
    2: () => new Uint16Array(arrayBuffer)[0],
    4: () => new Int32Array(arrayBuffer)[0],
    8: () => {
      const view = new DataView(arrayBuffer);
      const lowInt32 = view.getUint32(0, true);
      const highInt32 = view.getUint32(4, true);
      return (BigInt(highInt32) << BigInt(32)) | BigInt(lowInt32);
    }
  };

  return arrByte[byteLength] ? arrByte[byteLength]() : new Uint8Array(arrayBuffer)[0];
}

function convertToArrayBuffer(value: number | string, bigInt = false, tamanho = -1): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(bigInt ? 8 : 4);
  const dataView = new DataView(arrayBuffer);
  if (typeof value === 'number') {
    if (bigInt) {
      dataView.setBigUint64(0, BigInt(value), true);
    } else {
      dataView.setUint32(0, value, true);
    }
  } else if (typeof value === 'string') {
    for (let i = 0; i < value.length; i++) {
      dataView.setUint8(i, value.charCodeAt(i));
    }
  }
  return arrayBuffer;
}
