# -*- coding: utf-8 -*-
# Generated by the protocol buffer compiler.  DO NOT EDIT!
# NO CHECKED-IN PROTOBUF GENCODE
# source: devices.proto
# Protobuf Python Version: 5.29.0
"""Generated protocol buffer code."""
from google.protobuf import descriptor as _descriptor
from google.protobuf import descriptor_pool as _descriptor_pool
from google.protobuf import runtime_version as _runtime_version
from google.protobuf import symbol_database as _symbol_database
from google.protobuf.internal import builder as _builder
_runtime_version.ValidateProtobufRuntimeVersion(
    _runtime_version.Domain.PUBLIC,
    5,
    29,
    0,
    '',
    'devices.proto'
)
# @@protoc_insertion_point(imports)

_sym_db = _symbol_database.Default()




DESCRIPTOR = _descriptor_pool.Default().AddSerializedFile(b'\n\rdevices.proto\x12\x07\x64\x65vices\":\n\x07TvState\x12\r\n\x05power\x18\x01 \x01(\t\x12\x0e\n\x06source\x18\x02 \x01(\t\x12\x10\n\x08platform\x18\x03 \x01(\t\"l\n\x0e\x43ommandRequest\x12\x13\n\x0b\x64\x65vice_name\x18\x01 \x01(\t\x12\r\n\x05order\x18\x02 \x01(\t\x12\r\n\x05value\x18\x03 \x01(\x05\x12\'\n\rcurrent_state\x18\x04 \x01(\x0b\x32\x10.devices.TvState\"^\n\x0c\x43ommandReply\x12\x13\n\x0b\x64\x65vice_name\x18\x01 \x01(\t\x12\x10\n\x08response\x18\x02 \x01(\t\x12\'\n\rcurrent_state\x18\x03 \x01(\x0b\x32\x10.devices.TvState2I\n\x0cManageDevice\x12\x39\n\x07\x63ommand\x12\x17.devices.CommandRequest\x1a\x15.devices.CommandReplyb\x06proto3')

_globals = globals()
_builder.BuildMessageAndEnumDescriptors(DESCRIPTOR, _globals)
_builder.BuildTopDescriptorsAndMessages(DESCRIPTOR, 'devices_pb2', _globals)
if not _descriptor._USE_C_DESCRIPTORS:
  DESCRIPTOR._loaded_options = None
  _globals['_TVSTATE']._serialized_start=26
  _globals['_TVSTATE']._serialized_end=84
  _globals['_COMMANDREQUEST']._serialized_start=86
  _globals['_COMMANDREQUEST']._serialized_end=194
  _globals['_COMMANDREPLY']._serialized_start=196
  _globals['_COMMANDREPLY']._serialized_end=290
  _globals['_MANAGEDEVICE']._serialized_start=292
  _globals['_MANAGEDEVICE']._serialized_end=365
# @@protoc_insertion_point(module_scope)
