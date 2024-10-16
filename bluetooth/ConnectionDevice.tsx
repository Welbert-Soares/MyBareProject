import {
  View,
  Text,
  PermissionsAndroid,
  NativeModules,
  NativeEventEmitter,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native"
import React, { useEffect, useState } from "react"
import BleManager from "react-native-ble-manager"

const ConnectionDevice = () => {
  const [isScanning, setIsScanning] = useState(false)
  const [bleDevices, setBleDevices] = useState([])
  const BleManagerModule = NativeModules.BleManager
  const BleManagerEmitter = new NativeEventEmitter(BleManagerModule)

  useEffect(() => {
    BleManager.start({ showAlert: false }).then(() => {
      // Success code
      console.log("Module initialized")
    })
  })

  useEffect(() => {
    BleManager.enableBluetooth()
      .then(() => {
        // Success code
        console.log("The bluetooth is already enabled or the user confirm")
        requestPermission()
      })
      .catch((error) => {
        // Failure code
        console.log("The user refuse to enable bluetooth")
      })
  }, [])

  useEffect(() => {
    let stopListener = BleManagerEmitter.addListener(
      "BleManagerStopScan",
      () => {
        setIsScanning(false)
        handleGetConnectedDevices()
        console.log("Stop")
      }
    )

    return () => stopListener.remove()
  }, [])

  const requestPermission = async () => {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ])

    if (granted) {
      startScanning()
    }
  }

  const startScanning = () => {
    BleManager.scan([], 10, false)
      .then(() => {
        // Success code
        console.log("Scan started")
        setIsScanning(true)
      })
      .catch((error) => {
        console.error(error)
      })
  }

  const handleGetConnectedDevices = () => {
    BleManager.getDiscoveredPeripherals().then((result: any) => {
      if (result.length === 0) {
        console.log("No devices found")
        startScanning()
      } else {
        // console.log("RESULTS", JSON.stringify(result))
        const allDevices = result.filter((device: any) => device.name !== null)
        setBleDevices(allDevices)
      }
      // Success code
      console.log("Discovered peripherals: " + result)
    })
  }

  const renderItem = ({ item, i }: any) => {
    return (
      <View style={styles.bleCard}>
        <Text style={styles.bleTxt}>{item.name}</Text>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.btnText}>Connect</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {isScanning ? (
        <View style={styles.rippleView}>
          <Text style={styles.text}>Scanning...</Text>
        </View>
      ) : (
        <View>
          <FlatList
            data={bleDevices}
            keyExtractor={(item, i) => i.toString()}
            renderItem={renderItem}
          />
        </View>
      )}
    </View>
  )
}

export default ConnectionDevice

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rippleView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bleCard: {
    width: "70%",
    padding: 10,
    alignSelf: "center",
    marginVertical: 10,
    backgroundColor: "#f0f0f0",
    elevation: 5,
    borderRadius: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  text: {
    fontSize: 20,
    color: "#fff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  bleTxt: {
    fontFamily: "Roboto",
    fontSize: 18,
    color: "#000",
  },
  btnText: {
    fontFamily: "Roboto",
    fontSize: 18,
    color: "#fff",
  },
  button: {
    width: 100,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 5,
    backgroundColor: "#3ef806fa",
  },
})
