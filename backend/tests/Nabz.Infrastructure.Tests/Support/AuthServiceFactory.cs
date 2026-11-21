/*
 File: backend/tests/Nabz.Infrastructure.Tests/Support/AuthServiceFactory.cs
 Description: ساخت AuthService با FixedOtp و fakeهای in-memory
 Parent Dependencies: AuthService, Fakes
 */

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Nabz.Application.Options;
using Nabz.Infrastructure.Services;
using Nabz.Infrastructure.Tests.Fakes;

namespace Nabz.Infrastructure.Tests.Support;

public sealed class AuthServiceFactory
{
    public InMemoryStore Store { get; } = new();
    public FakeSmsSender Sms { get; } = new();
    public FakeUnitOfWork UnitOfWork { get; }

    public AuthServiceFactory()
    {
        UnitOfWork = new FakeUnitOfWork(Store);
    }

    public AuthService Create(string fixedOtp = "12345")
    {
        var authOptions = Options.Create(new AuthOptions { FixedOtp = fixedOtp });
        var kavenegarOptions = Options.Create(new KavenegarOptions());
        var users = new FakeUserRepository(Store);
        var persons = new FakePersonRepository(Store);
        var contracts = new FakeContractRepository(Store);
        var patients = new FakePatientRepository(Store);
        var clinics = new FakeClinicRepository(Store);
        var patientService = new PatientService(
            patients,
            new FakePatientProfileRevisionRepository(Store),
            contracts,
            users,
            persons,
            new FakeFormRepository(Store),
            new FakeEvidenceRepository(Store),
            clinics,
            UnitOfWork);

        return new AuthService(
            users,
            persons,
            new FakeAuthRepository(Store),
            contracts,
            patients,
            clinics,
            new FakePlatformRepository(Store),
            patientService,
            UnitOfWork,
            Sms,
            authOptions,
            kavenegarOptions,
            NullLogger<AuthService>.Instance);
    }
}