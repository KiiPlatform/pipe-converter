## 1. Run gateway-agent
- change `master_app` section with your kii app in `config.yml`.
- run gateway-agent under debug mode.

```shell
# go to root folder of gateway-agent
$ make run-debug
```

## 2. Run pipe-converter

### Install dependencies

```shell
$ npm install
```

### Copy config file

```shell
$ cp examples/config.json ./
```
- change `kii_app`. Make sure `kii_app` is same as `master_app` for gateway agent in step 1.
- change `sensor_id`.

### Run pipe-converter

```shell
$ node pipe-converter.js
```
Now, the sensor should be pended in gateway agent, which means the sensor device is not registered to kii cloud yet. You can see the output of gateway-agent, like:

```shell
IoTGW 19:00:40 pended: endnodeID=jp-oa8ucuzcu7qg-B02EA1FD-324B-4BB0-AB0E-ACD67BBD26F2 data={"humidity":55,"illumination":2570,"temperature":26}
```

We need to onboard the pended sensor to registered the sensor to kii cloud. Move on to nex step.

## Onboard sensor
Onboard sensor use [gwm-cli](https://github.com/KiiPlatform/gwm-cli)

### Setup Gateway using gwm-cli

```shell
cd $GOPATH/src/github.com/KiiPlatform/gwm-cli
```

#### Local authentication
Note: do not expose security credentials in your real service.

```shell
./gwm-cli auth --username admin_user --password admin_pass --app-name master
```

#### Gateway onboarding
By this operation, Gateway information is sent to Kii Cloud and can be managed
through the cloud.

```shell
./gwm-cli onboard-gateway --app-name master
```

#### Kii user login
Kii Gateway will be managed by the User in Kii Cloud called owner.
Only the owner can manage the Gateway,
so that it will be protected from malicious act.
Execute user sign-up/ login before owner registration.


Replace {username}/ {password} section.

If you haven't created User in Kii Cloud, it will create new user.
```shell
./gwm-cli user-login --username {username} --password {password} --app-name master
```

#### Owner registration of gateway

Replace {gateway password} with the same string configured in thingPassword in gateway-agent/config.yml

```shell
./gwm-cli add-owner --gateway-password {gateway password} --app-name master
```

#### Onboard pended device with gwm-cli

```shell
./gwm-cli list-pending-nodes --app-name master
```

You'll see output like this:

```
2017/04/20 18:21:40 pending nodes:
[B02EA1FD-324B-4BB0-AB0E-ACD67BBD26F1]
```

This means device with id 'B02EA1FD-324B-4BB0-AB0E-ACD67BBD26F1' is waiting to be onboarded to the Kii Cloud. The `id` must be same as `sensor_id`, configured in step 2.
Let's get thing done.

You can put passowrd of the sensor device in --node-password option.

(Arbitrary value can be set, but don't forget it.)

This is also a protection for malicious act.

```shell
./gwm-cli onboard-node --node-vid B02EA1FD-324B-4BB0-AB0E-ACD67BBD26F1 --node-password {node password} --app-name master
```

Now, both Gateway and sensor Device are managed in cloud.
Data from sensor should be automatically uploaded to kii cloud.



