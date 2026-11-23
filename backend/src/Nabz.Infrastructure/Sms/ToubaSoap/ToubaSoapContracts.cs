/*
 File: backend/src/Nabz.Infrastructure/Sms/ToubaSoap/ToubaSoapContracts.cs
 Description: قرارداد مینیمال SOAP طوبی (TSMS) — UserInfo و sendSms مطابق نمونه WSDL
 Parent Dependencies: System.ServiceModel.Primitives
 */

using System.ServiceModel;
using System.Xml.Serialization;

namespace Nabz.Infrastructure.Sms.ToubaSoap;

[ServiceContract(Namespace = "http://sms.tsms.ir/", ConfigurationName = "ToubaSoap.tsmsService")]
public interface IToubaTsmsService
{
    [OperationContract(Action = "", ReplyAction = "*")]
    [XmlSerializerFormat(Style = OperationFormatStyle.Rpc, SupportFaults = true, Use = OperationFormatUse.Encoded)]
    [return: MessageParameter(Name = "UserInfoResponse")]
    [ServiceKnownType(typeof(ToubaObjectInfo))]
    ToubaObjectInfo[] UserInfo(string username, string password);

    [OperationContract(Action = "", ReplyAction = "*")]
    [XmlSerializerFormat(Style = OperationFormatStyle.Rpc, SupportFaults = true, Use = OperationFormatUse.Encoded)]
    [return: MessageParameter(Name = "sendSmsResult")]
    int[] sendSms(
        string username,
        string password,
        string[] sms_number,
        string[] mobile,
        string[] msg,
        string[] mclass,
        string messageid);
}

[SoapType(Namespace = "http://sms.tsms.ir/")]
public sealed class ToubaObjectInfo
{
    public int credit { get; set; }

    [SoapIgnore]
    public bool creditSpecified { get; set; }

    // املای فیلد در WSDL نمونه: sms_numebrs
    public string[]? sms_numebrs { get; set; }
}

public sealed class ToubaTsmsServiceClient : ClientBase<IToubaTsmsService>, IToubaTsmsService
{
    public ToubaTsmsServiceClient(System.ServiceModel.Channels.Binding binding, EndpointAddress remoteAddress)
        : base(binding, remoteAddress)
    {
    }

    public ToubaObjectInfo[] UserInfo(string username, string password)
        => Channel.UserInfo(username, password);

    public int[] sendSms(
        string username,
        string password,
        string[] sms_number,
        string[] mobile,
        string[] msg,
        string[] mclass,
        string messageid)
        => Channel.sendSms(username, password, sms_number, mobile, msg, mclass, messageid);
}
