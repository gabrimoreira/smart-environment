# Generated by the gRPC Python protocol compiler plugin. DO NOT EDIT!
"""Client and server classes corresponding to protobuf-defined services."""
import grpc
import warnings

import devices_pb2 as devices__pb2

GRPC_GENERATED_VERSION = '1.70.0'
GRPC_VERSION = grpc.__version__
_version_not_supported = False

try:
    from grpc._utilities import first_version_is_lower
    _version_not_supported = first_version_is_lower(GRPC_VERSION, GRPC_GENERATED_VERSION)
except ImportError:
    _version_not_supported = True

if _version_not_supported:
    raise RuntimeError(
        f'The grpc package installed is at version {GRPC_VERSION},'
        + f' but the generated code in devices_pb2_grpc.py depends on'
        + f' grpcio>={GRPC_GENERATED_VERSION}.'
        + f' Please upgrade your grpc module to grpcio>={GRPC_GENERATED_VERSION}'
        + f' or downgrade your generated code using grpcio-tools<={GRPC_VERSION}.'
    )


class ManageDeviceStub(object):
    """Missing associated documentation comment in .proto file."""

    def __init__(self, channel):
        """Constructor.

        Args:
            channel: A grpc.Channel.
        """
        self.command = channel.unary_unary(
                '/devices.ManageDevice/command',
                request_serializer=devices__pb2.CommandRequest.SerializeToString,
                response_deserializer=devices__pb2.CommandReply.FromString,
                _registered_method=True)


class ManageDeviceServicer(object):
    """Missing associated documentation comment in .proto file."""

    def command(self, request, context):
        """Missing associated documentation comment in .proto file."""
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details('Method not implemented!')
        raise NotImplementedError('Method not implemented!')


def add_ManageDeviceServicer_to_server(servicer, server):
    rpc_method_handlers = {
            'command': grpc.unary_unary_rpc_method_handler(
                    servicer.command,
                    request_deserializer=devices__pb2.CommandRequest.FromString,
                    response_serializer=devices__pb2.CommandReply.SerializeToString,
            ),
    }
    generic_handler = grpc.method_handlers_generic_handler(
            'devices.ManageDevice', rpc_method_handlers)
    server.add_generic_rpc_handlers((generic_handler,))
    server.add_registered_method_handlers('devices.ManageDevice', rpc_method_handlers)


 # This class is part of an EXPERIMENTAL API.
class ManageDevice(object):
    """Missing associated documentation comment in .proto file."""

    @staticmethod
    def command(request,
            target,
            options=(),
            channel_credentials=None,
            call_credentials=None,
            insecure=False,
            compression=None,
            wait_for_ready=None,
            timeout=None,
            metadata=None):
        return grpc.experimental.unary_unary(
            request,
            target,
            '/devices.ManageDevice/command',
            devices__pb2.CommandRequest.SerializeToString,
            devices__pb2.CommandReply.FromString,
            options,
            channel_credentials,
            insecure,
            call_credentials,
            compression,
            wait_for_ready,
            timeout,
            metadata,
            _registered_method=True)
