import chai from 'chai';
import Chance from 'chance';
import { Datastore } from '@google-cloud/datastore';

import { Gstore, Entity, EntityKey } from '../../src';

type GenericObject = { [key: string]: any };

const gstore = new Gstore();
const ds = new Datastore({ projectId: 'gstore-integration-tests' });
gstore.connect(ds);

const { Schema } = gstore;
const { expect } = chai;
const userSchema = new Schema({ name: { type: String } });
const chance = new Chance();

let generatedIds: string[] = [];
const allKeys: EntityKey[] = [];

const UserModel = gstore.model('GstoreTests-User', userSchema);

const getId = (): string => {
  const id = chance.string({ pool: 'abcdefghijklmnopqrstuvwxyz' });
  if (generatedIds.includes(id)) {
    return getId();
  }
  generatedIds.push(id);
  return id;
};

const getUser = (): Entity<any> & GenericObject => {
  const key = UserModel.key(getId());
  allKeys.push(key);
  const data = { name: chance.string() };
  const user = new UserModel(data, undefined, undefined, undefined, key);
  return user;
};

const cleanUp = (): Promise<any> =>
  ((ds.delete(allKeys) as unknown) as Promise<any>)
    .then(() => UserModel.deleteAll())
    .catch(err => {
                console.log('Error cleaning up'); // eslint-disable-line
                console.log(err); // eslint-disable-line
    });

describe('Gstore (Integration Tests)', () => {
  beforeAll(() => {
    generatedIds = [];
  });

  afterAll(() => cleanUp());

  describe('save()', () => {
    test('should convert entities to Datastore format and save them', () => {
      const users = [getUser(), getUser()];
      return gstore.save(users).then(() =>
        UserModel.list().then(({ entities: { 0: entity } }) => {
          expect([users[0].name, users[1].name]).include(entity.name);
        }),
      );
    });
  });
});
