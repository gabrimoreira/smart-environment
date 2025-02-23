// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var devices_pb = require('./devices_pb.js');

function serialize_devices_CommandReply(arg) {
  if (!(arg instanceof devices_pb.CommandReply)) {
    throw new Error('Expected argument of type devices.CommandReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_devices_CommandReply(buffer_arg) {
  return devices_pb.CommandReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_devices_CommandRequest(arg) {
  if (!(arg instanceof devices_pb.CommandRequest)) {
    throw new Error('Expected argument of type devices.CommandRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_devices_CommandRequest(buffer_arg) {
  return devices_pb.CommandRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


var ManageDeviceService = exports.ManageDeviceService = {
  command: {
    path: '/devices.ManageDevice/command',
    requestStream: false,
    responseStream: false,
    requestType: devices_pb.CommandRequest,
    responseType: devices_pb.CommandReply,
    requestSerialize: serialize_devices_CommandRequest,
    requestDeserialize: deserialize_devices_CommandRequest,
    responseSerialize: serialize_devices_CommandReply,
    responseDeserialize: deserialize_devices_CommandReply,
  },
};

exports.ManageDeviceClient = grpc.makeGenericClientConstructor(ManageDeviceService);
