<script>
class SenseHid {
    constructor(hidDevice) {
        this.device_ = hidDevice;
        this.connectionType_ = null;

        // Output report state.
        this.outputSeq_ = 1;

        // WebHID API doesn't indicate whether we are connected through the controller's
        // USB or Bluetooth interface. The protocol is different depending on the connection
        // type so we will try to detect it based on the collection information.
        this.connectionType_ = "unknown";
        for (const c of this.device_.collections) {
            if (c.usagePage != USAGE_PAGE_GENERIC_DESKTOP || c.usage != USAGE_ID_GD_GAME_PAD) continue;

            // Compute the maximum input report byte length and compare against known values.
            let maxInputReportBytes = c.inputReports.reduce((max, report) => {
                return Math.max(
                    max,
                    report.items.reduce((sum, item) => {
                        return sum + item.reportSize * item.reportCount;
                    }, 0)
                );
            }, 0);
            if (maxInputReportBytes == 504) this.connectionType_ = "usb";
            else if (maxInputReportBytes == 616) this.connectionType_ = "bluetooth";
        }
    }

    initialize() {
        this.device_.oninputreport = (e) => {
            this.onInputReport(e);
        };
    }

    async readFeatureReport05() {
        // By default, bluetooth-connected Sense only sends input report 0x01 which omits motion and touchpad data.
        // Reading feature report 0x05 causes it to start sending input report 0x31.
        //
        // Note: The Gamepad API will do this for us if it enumerates the gamepad.
        // Other applications like Steam may have also done this already.
        if (this.connectionType_ == "bluetooth") await device.receiveFeatureReport(0x05);
    }

    onConnectionError() {
        productNameText.value = "";
        vidPidText.value = "";
        connectionTypeText.value = "";
        inputReportTextArea.value = "";
        outputReportTextArea.value = "";
        delete window.dshid;
    }

    handleUsbInputReport01(report) {
        if (report.byteLength != DUAL_SENSE_USB_INPUT_REPORT_0x01_SIZE) return;

        let axes0 = report.getUint8(0);
        let axes1 = report.getUint8(1);
        let axes2 = report.getUint8(2);
        let axes3 = report.getUint8(3);
        let axes4 = report.getUint8(4);
        let axes5 = report.getUint8(5);

        let gyroX0 = report.getUint8(15);
        let gyroX1 = report.getUint8(16);
        let gyroY0 = report.getUint8(17);
        let gyroY1 = report.getUint8(18);
        let gyroZ0 = report.getUint8(19);
        let gyroZ1 = report.getUint8(20);
        let accelX0 = report.getUint8(21);
        let accelX1 = report.getUint8(22);
        let accelY0 = report.getUint8(23);
        let accelY1 = report.getUint8(24);
        let accelZ0 = report.getUint8(25);
        let accelZ1 = report.getUint8(26);


        let gyrox = (gyroX1 << 8) | gyroX0;
        if (gyrox > 0x7fff) gyrox -= 0x10000;
        let gyroy = (gyroY1 << 8) | gyroY0;
        if (gyroy > 0x7fff) gyroy -= 0x10000;
        let gyroz = (gyroZ1 << 8) | gyroZ0;
        if (gyroz > 0x7fff) gyroz -= 0x10000;
        let accelx = (accelX1 << 8) | accelX0;
        if (accelx > 0x7fff) accelx -= 0x10000;
        let accely = (accelY1 << 8) | accelY0;
        if (accely > 0x7fff) accely -= 0x10000;
        let accelz = (accelZ1 << 8) | accelZ0;
        if (accelz > 0x7fff) accelz -= 0x10000;

        gyroXText.value = gyrox;
        gyroYText.value = gyroy;
        gyroZText.value = gyroz;
        accelXText.value = accelx;
        accelYText.value = accely;
        accelZText.value = accelz;

    }

    handleBluetoothInputReport01(report) {
        if (report.byteLength != DUAL_SENSE_BT_INPUT_REPORT_0x01_SIZE) {
            return;
        }

        let axes0 = report.getUint8(0);
        let axes1 = report.getUint8(1);
        let axes2 = report.getUint8(2);
        let axes3 = report.getUint8(3);
        let axes4 = report.getUint8(7);
        let axes5 = report.getUint8(8);

    }

    handleBluetoothInputReport31(report) {
        if (report.byteLength != DUAL_SENSE_BT_INPUT_REPORT_0x31_SIZE) {
            return;
        }

        // byte 0?
        let axes0 = report.getUint8(1);
        let axes1 = report.getUint8(2);
        let axes2 = report.getUint8(3);
        let axes3 = report.getUint8(4);
        let axes4 = report.getUint8(5);
        let axes5 = report.getUint8(6);

        let gyroX0 = report.getUint8(16);
        let gyroX1 = report.getUint8(17);
        let gyroY0 = report.getUint8(18);
        let gyroY1 = report.getUint8(19);
        let gyroZ0 = report.getUint8(20);
        let gyroZ1 = report.getUint8(21);
        let accelX0 = report.getUint8(22);
        let accelX1 = report.getUint8(23);
        let accelY0 = report.getUint8(24);
        let accelY1 = report.getUint8(25);
        let accelZ0 = report.getUint8(26);
        let accelZ1 = report.getUint8(27);

        let gyrox = (gyroX1 << 8) | gyroX0;
        if (gyrox > 0x7fff) gyrox -= 0x10000;
        let gyroy = (gyroY1 << 8) | gyroY0;
        if (gyroy > 0x7fff) gyroy -= 0x10000;
        let gyroz = (gyroZ1 << 8) | gyroZ0;
        if (gyroz > 0x7fff) gyroz -= 0x10000;
        let accelx = (accelX1 << 8) | accelX0;
        if (accelx > 0x7fff) accelx -= 0x10000;
        let accely = (accelY1 << 8) | accelY0;
        if (accely > 0x7fff) accely -= 0x10000;
        let accelz = (accelZ1 << 8) | accelZ0;
        if (accelz > 0x7fff) accelz -= 0x10000;


        gyroXText.value = gyrox;
        gyroYText.value = gyroy;
        gyroZText.value = gyroz;
        accelXText.value = accelx;
        accelYText.value = accely;
        accelZText.value = accelz;

    }

    onInputReport(event) {
        let reportId = event.reportId;
        let report = event.data;
        let reportString = hex8(reportId);
        for (let i = 0; i < report.byteLength; ++i) reportString += " " + hex8(report.getUint8(i));

        inputReportTextArea.value = reportString;

        productNameText.value = event.device.productName;
        vidPidText.value = hex16(event.device.vendorId) + ":" + hex16(event.device.productId);
        connectionTypeText.value = this.connectionType_;

        if (this.connectionType_ == "usb") {
            if (reportId == 0x01) this.handleUsbInputReport01(report);
            else return;
        } else if (this.connectionType_ == "bluetooth") {
            if (reportId == 0x01) this.handleBluetoothInputReport01(report);
            else if (reportId == 0x31) this.handleBluetoothInputReport31(report);
            else return;
        } else {
            return;
        }
    }


    const requestDevice = async () => {
        let requestOptions = {
            filters: [
                {
                    vendorId: VENDOR_ID_SONY,
                    productId: PRODUCT_ID_DUAL_SENSE,
                    usagePage: USAGE_PAGE_GENERIC_DESKTOP,
                    usage: USAGE_ID_GD_GAME_PAD,
                },
            ],
        };

        try {
            let devices = await navigator.hid.requestDevice(requestOptions);
            device = devices[0];
        } catch (e) { }

        if (!device) return;

        if (!device.opened) {
            await device.open();
            if (!device.opened) {
                console.log("Failed to open " + device.productName);
                return;
            }
        }

        console.log("Opened Sense");
        window.dshid = new SenseHid(device);
        window.dshid.initialize();
    };

    const onRAF = async () => {
        window.requestAnimationFrame(onRAF);
        if (window.dshid !== undefined) {
            const sent = await window.dshid.sendOutputReport();
            if (!sent) window.dshid.onConnectionError();
        }
    };
    
    window.requestAnimationFrame(onRAF);

    const checkForGrantedDevices = async () => {
        if (window.dshid !== undefined && !window.dshid.opened) {
            console.log("Sense disconnected");
            window.dshid.onConnectionError();
        }

        if (window.dshid !== undefined) return;

        console.log("Checking for a connected Sense");
        // Check if we already have permissions for a Sense device.
        const devices = await navigator.hid.getDevices();
        for (const device of devices) {
            if (device.vendorId == VENDOR_ID_SONY && device.productId == PRODUCT_ID_DUAL_SENSE) {
                if (!device.opened) {
                    await device.open();
                    if (!device.opened) continue;
                }

                console.log("Opened Sense");
                window.dshid = new SenseHid(device);
                window.dshid.initialize();
                return;
            }
        }
        console.log("No Sense found");
    };


window.addEventListener("DOMContentLoaded", async (e) => {
    if (window.dshid === undefined) checkForGrantedDevices();

    navigator.hid.onconnect = checkForGrantedDevices;
    navigator.hid.ondisconnect = checkForGrantedDevices;
});
</script>